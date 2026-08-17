import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validation";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const expenses = await prisma.expensePlan.findMany({ orderBy: { plannedDate: "asc" }, include: { createdBy: { select: { name: true } }, approvedBy: { select: { name: true } } } });
  return NextResponse.json(serializeBigInt({ expenses }));
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat membuat pengeluaran" }, { status: 403 });
  const parsed = createExpenseSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Data pengeluaran tidak valid", details: parsed.error.flatten() }, { status: 400 });
  const expense = await prisma.expensePlan.create({ data: { code: `EXP-${Date.now()}`, ...parsed.data, amount: BigInt(parsed.data.amount), createdById: actor.id } });
  await prisma.auditLog.create({ data: { userId: actor.id, action: "expense_created", entityType: "ExpensePlan", entityId: expense.id, metadata: { status: "submitted" } } });
  return NextResponse.json(serializeBigInt({ expense }), { status: 201 });
}
