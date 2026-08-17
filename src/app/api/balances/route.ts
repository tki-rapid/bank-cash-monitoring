import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const accounts = await prisma.bankAccount.findMany({ where: { active: true }, include: { bank: true, balanceSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 } }, orderBy: { displayName: "asc" } });
  return NextResponse.json(serializeBigInt({ balances: accounts.map((account) => {
    const snapshot = account.balanceSnapshots[0];
    const capturedAt = account.lastCapturedAt ?? snapshot?.capturedAt ?? null;
    return { accountId: account.id, bank: account.bank.name, displayName: account.displayName, accountNumber: account.accountNumber, availableBalance: account.lastAvailableBalance ?? snapshot?.availableBalance ?? BigInt(0), capturedAt, source: account.lastBalanceSource ?? snapshot?.source ?? "manual", freshness: capturedAt && Date.now() - capturedAt.getTime() < 24 * 60 * 60 * 1000 ? "current" : "stale" };
  }) }));
}
