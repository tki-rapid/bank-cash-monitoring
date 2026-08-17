import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const [accounts, expenses, runs] = await Promise.all([
    prisma.bankAccount.findMany({ where: { active: true }, include: { bank: true }, orderBy: { displayName: "asc" } }),
    prisma.expensePlan.findMany({ orderBy: { plannedDate: "asc" }, take: 50 }),
    prisma.bankRetrievalRun.findMany({ orderBy: { requestedAt: "desc" }, take: 20, include: { bank: true, account: true } }),
  ]);
  const totalCash = accounts.reduce((sum, account) => sum + (account.lastAvailableBalance ?? BigInt(0)), BigInt(0));
  return NextResponse.json(serializeBigInt({ totalCash, accounts, expenses, runs }));
}
