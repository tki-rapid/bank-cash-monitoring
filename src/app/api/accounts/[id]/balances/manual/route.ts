import { NextResponse } from "next/server";
import { getCurrentActor, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manualBalanceSchema } from "@/lib/validation";
import { serializeBigInt } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat menginput saldo manual" }, { status: 403 });
  const { id } = await params;
  const parsed = manualBalanceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Saldo harus berupa bilangan bulat IDR yang tidak negatif" }, { status: 400 });
  const account = await prisma.bankAccount.findFirst({ where: { id, active: true } });
  if (!account) return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 404 });
  const snapshot = await prisma.$transaction(async (tx) => {
    const created = await tx.balanceSnapshot.create({ data: { bankAccountId: id, source: "manual", availableBalance: BigInt(parsed.data.availableBalance), capturedAt: new Date(), accountNumberAtCapture: account.accountNumber, enteredById: actor.id, note: parsed.data.note } });
    await tx.bankAccount.update({ where: { id }, data: { lastAvailableBalance: BigInt(parsed.data.availableBalance), lastCapturedAt: created.capturedAt, lastBalanceSource: "manual" } });
    await tx.auditLog.create({ data: { userId: actor.id, action: "manual_balance_created", entityType: "BankAccount", entityId: id, metadata: { source: "manual", snapshotId: created.id } } });
    return created;
  });
  return NextResponse.json(serializeBigInt({ snapshot }), { status: 201 });
}
