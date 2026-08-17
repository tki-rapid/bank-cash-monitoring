import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";
import { isAuthorizedWorkerRequest } from "@/lib/bank-connectors/worker-auth";
import { validateComputerUseResult, type BankRunEvent } from "@/lib/bank-connectors/types";

const transitionError = "invalid_transition";

type RunStatus = "requested" | "awaiting_user_login" | "awaiting_captcha" | "extracting";

async function transitionRun(id: string, statuses: RunStatus[], data: Record<string, unknown>) {
  const changed = await prisma.bankRetrievalRun.updateMany({ where: { id, status: { in: statuses } }, data });
  if (changed.count !== 1) throw new Error(transitionError);
  return prisma.bankRetrievalRun.findUniqueOrThrow({ where: { id } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.DEMO_MODE !== "true") return NextResponse.json({ error: "Worker contract disabled until production authentication is configured" }, { status: 503 });
  if (!isAuthorizedWorkerRequest(request)) return NextResponse.json({ error: "Worker authentication required" }, { status: 401 });
  const { id } = await params;
  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return NextResponse.json({ error: "Event retrieval tidak valid" }, { status: 400 });
  const body = rawBody as Partial<BankRunEvent>;
  const run = await prisma.bankRetrievalRun.findUnique({ where: { id }, include: { account: true } });
  if (!run) return NextResponse.json({ error: "Retrieval run tidak ditemukan" }, { status: 404 });

  try {
    if (body.type === "awaiting_captcha") return NextResponse.json({ run: serializeBigInt(await transitionRun(id, ["requested", "awaiting_user_login"], { status: "awaiting_captcha", userAction: "Selesaikan CAPTCHA secara manual" })) });
    if (body.type === "awaiting_user_login") return NextResponse.json({ run: serializeBigInt(await transitionRun(id, ["requested"], { status: "awaiting_user_login", userAction: "Login bank harus diselesaikan oleh operator" })) });
    if (body.type === "extracting") return NextResponse.json({ run: serializeBigInt(await transitionRun(id, ["requested", "awaiting_user_login", "awaiting_captcha"], { status: "extracting", startedAt: run.startedAt ?? new Date() })) });
    if (body.type === "failed") {
      const updated = await transitionRun(id, ["requested", "awaiting_user_login", "awaiting_captcha", "extracting"], { status: "failed", errorCode: "worker_failed", completedAt: new Date(), userAction: "Computer Use retrieval gagal dan perlu pemeriksaan manual" });
      await prisma.auditLog.create({ data: { userId: run.requestedById, action: "retrieval_failed", entityType: "BankRetrievalRun", entityId: id, metadata: { errorCode: "worker_failed" } } });
      return NextResponse.json({ run: serializeBigInt(updated) });
    }
    if (body.type !== "succeeded") return NextResponse.json({ error: "Event retrieval tidak valid" }, { status: 400 });
    const result = validateComputerUseResult(body);
    if (result.accountNumber.replace(/\D/g, "") !== run.account.accountNumber.replace(/\D/g, "")) throw new Error("account_mismatch");
    const completed = await prisma.$transaction(async (tx) => {
      const changed = await tx.bankRetrievalRun.updateMany({ where: { id, status: "extracting" }, data: { status: "succeeded", completedAt: result.capturedAt, startedAt: run.startedAt ?? result.capturedAt } });
      if (changed.count !== 1) throw new Error(transitionError);
      const snapshot = await tx.balanceSnapshot.create({ data: { bankAccountId: run.bankAccountId, retrievalRunId: run.id, source: "computer_use", availableBalance: BigInt(result.availableBalance), capturedAt: result.capturedAt, accountNumberAtCapture: result.accountNumber } });
      await tx.bankAccount.update({ where: { id: run.bankAccountId }, data: { lastAvailableBalance: BigInt(result.availableBalance), lastCapturedAt: result.capturedAt, lastBalanceSource: "computer_use" } });
      await tx.auditLog.create({ data: { userId: run.requestedById, action: "retrieval_succeeded", entityType: "BankRetrievalRun", entityId: id, metadata: { source: "computer_use", snapshotId: snapshot.id } } });
      return tx.bankRetrievalRun.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json({ run: serializeBigInt(completed) });
  } catch (error) {
    if (error instanceof Error && error.message === transitionError) return NextResponse.json({ error: "Retrieval run sudah selesai atau transisi tidak diizinkan" }, { status: 409 });
    if (error instanceof Error && error.message === "account_mismatch") return NextResponse.json({ error: "Hasil bank tidak cocok dengan rekening retrieval" }, { status: 400 });
    return NextResponse.json({ error: "Hasil retrieval tidak dapat diproses" }, { status: 400 });
  }
}
