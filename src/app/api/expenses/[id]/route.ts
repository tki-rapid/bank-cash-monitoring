import { NextResponse } from "next/server";
import { getCurrentActor, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";

const transitions: Record<string, string[]> = { submitted: ["approved"], approved: ["paid"], paid: [] };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat mengubah status pengeluaran" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const nextStatus = typeof body.status === "string" ? body.status : "";
  const expense = await prisma.expensePlan.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
  if (!transitions[expense.status]?.includes(nextStatus)) return NextResponse.json({ error: "Perubahan status tidak diizinkan" }, { status: 400 });
  const updated = await prisma.expensePlan.update({ where: { id }, data: { status: nextStatus as "approved" | "paid", approvedById: nextStatus === "approved" ? actor.id : expense.approvedById, approvedAt: nextStatus === "approved" ? new Date() : expense.approvedAt, paidAt: nextStatus === "paid" ? new Date() : expense.paidAt } });
  await prisma.auditLog.create({ data: { userId: actor.id, action: "expense_status_changed", entityType: "ExpensePlan", entityId: id, metadata: { from: expense.status, to: nextStatus } } });
  return NextResponse.json(serializeBigInt({ expense: updated }));
}
