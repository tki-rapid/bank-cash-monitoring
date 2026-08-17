import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const alerts = await prisma.auditLog.findMany({ where: { action: { in: ["retrieval_failed", "forecast_shortfall", "manual_balance_created"] } }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json(serializeBigInt({ alerts }));
}
