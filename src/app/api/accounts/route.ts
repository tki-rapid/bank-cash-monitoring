import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccountSchema } from "@/lib/validation";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const accounts = await prisma.bankAccount.findMany({ where: { active: true }, include: { bank: true, balanceSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 } }, orderBy: [{ bankInstitutionId: "asc" }, { displayName: "asc" }] });
  return NextResponse.json(serializeBigInt({ accounts }));
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat menambah rekening" }, { status: 403 });
  const parsed = createAccountSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Data rekening tidak valid", details: parsed.error.flatten() }, { status: 400 });
  const institution = await prisma.bankInstitution.findFirst({ where: { id: parsed.data.bankInstitutionId, active: true } });
  if (!institution) return NextResponse.json({ error: "Bank institution tidak ditemukan atau tidak aktif" }, { status: 404 });
  const account = await prisma.bankAccount.create({ data: parsed.data });
  return NextResponse.json(account, { status: 201 });
}
