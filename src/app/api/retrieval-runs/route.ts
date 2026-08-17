import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRetrievalRunSchema } from "@/lib/validation";
import { serializeBigInt } from "@/lib/api";
import { getBankConnector } from "@/lib/bank-connectors/registry";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const runs = await prisma.bankRetrievalRun.findMany({ orderBy: { requestedAt: "desc" }, take: 25, include: { bank: true, account: true } });
  return NextResponse.json(serializeBigInt({ runs }));
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat memulai retrieval" }, { status: 403 });
  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const parsed = createRetrievalRunSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Rekening tidak valid" }, { status: 400 });
  const account = await prisma.bankAccount.findFirst({ where: { id: parsed.data.bankAccountId, active: true }, include: { bank: true } });
  if (!account) return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 404 });
  const connector = getBankConnector(account.bank.portalKey);
  if (!connector) return NextResponse.json({ error: `Connector ${account.bank.name} belum tersedia` }, { status: 409 });
  const run = await prisma.bankRetrievalRun.create({ data: { bankInstitutionId: account.bankInstitutionId, bankAccountId: account.id, requestedById: actor.id, status: "awaiting_user_login", connectorVersion: `${account.bank.portalKey}-contract-v1`, userAction: "Login dan CAPTCHA harus diselesaikan oleh operator" } });
  try {
    await connector.start(run.id);
  } catch {
    await prisma.bankRetrievalRun.update({ where: { id: run.id }, data: { status: "failed", errorCode: "connector_start_failed", completedAt: new Date(), userAction: "Connector bank gagal dimulai" } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: "retrieval_failed", entityType: "BankRetrievalRun", entityId: run.id, metadata: { errorCode: "connector_start_failed" } } });
    return NextResponse.json({ error: "Connector bank gagal dimulai" }, { status: 502 });
  }
  return NextResponse.json({ run: serializeBigInt(run), message: `Retrieval ${account.bank.name} dibuat. Login dan CAPTCHA harus diselesaikan operator pada alur Computer Use.` }, { status: 201 });
}
