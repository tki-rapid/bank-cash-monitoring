import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const banks = await prisma.bankInstitution.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { accounts: { where: { active: true }, orderBy: { displayName: "asc" } } } });
  return NextResponse.json(serializeBigInt({ banks }));
}
