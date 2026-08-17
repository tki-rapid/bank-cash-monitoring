import { NextResponse } from "next/server";
import { getCurrentActor, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";
import { getBankConnector } from "@/lib/bank-connectors/registry";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat membatalkan retrieval" }, { status: 403 });
  const { id } = await params;
  const run = await prisma.bankRetrievalRun.findUnique({ where: { id }, include: { account: { include: { bank: true } } } });
  if (!run) return NextResponse.json({ error: "Retrieval run tidak ditemukan" }, { status: 404 });
  const changed = await prisma.bankRetrievalRun.updateMany({ where: { id, status: { in: ["requested", "awaiting_user_login", "awaiting_captcha", "extracting"] } }, data: { status: "cancelled", completedAt: new Date(), userAction: "Dibatalkan oleh Finance" } });
  if (changed.count !== 1) return NextResponse.json({ error: "Retrieval run sudah selesai" }, { status: 409 });
  await getBankConnector(run.account.bank.portalKey)?.cancel(id);
  const updated = await prisma.bankRetrievalRun.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ run: serializeBigInt(updated) });
}
