import { NextResponse } from "next/server";
import { getCurrentActor, canReadFinancialData, canManageExpenses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/api";
import { buildAllScenarios, type CashFlow, type ForecastInput } from "@/lib/forecasting";
import { forecastInputSchema } from "@/lib/validation";

function monthKey(date: Date): string { return date.toISOString().slice(0, 7); }
function nextMonths(count: number): string[] { const now = new Date(); return Array.from({ length: count }, (_, index) => { const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + index, 1)); return monthKey(date); }); }
function monthDifference(start: Date, targetMonth: string): number { const target = new Date(`${targetMonth}-01T00:00:00Z`); return (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + target.getUTCMonth() - start.getUTCMonth(); }
function recurrenceMatches(recurrence: string, difference: number): boolean { if (difference < 0) return false; if (recurrence === "one_time") return difference === 0; if (recurrence === "monthly") return true; if (recurrence === "quarterly") return difference % 3 === 0; if (recurrence === "annual") return difference % 12 === 0; return false; }
function expandCashFlow(months: string[], start: Date, amount: bigint, recurrence: string, endDate?: Date): CashFlow[] { return months.filter((month) => { const target = new Date(`${month}-01T00:00:00Z`); return recurrenceMatches(recurrence, monthDifference(start, month)) && (!endDate || target <= endDate); }).map((month) => ({ month, amount })); }
function scenarioFlows(months: string[], inputs: Array<{ amount: bigint; effectiveDate: Date; endDate: Date | null; direction: string; scenario: string; recurrence: string }>, scenario: string, direction: "inflow" | "outflow"): CashFlow[] {
  const selected = inputs.filter((input) => input.direction === direction && input.scenario === scenario);
  const fallback = inputs.filter((input) => input.direction === direction && input.scenario === "base");
  return (selected.length ? selected : fallback).flatMap((input) => expandCashFlow(months, input.effectiveDate, input.amount, input.recurrence, input.endDate ?? undefined));
}

export async function GET() {
  const actor = await getCurrentActor();
  if (!canReadFinancialData(actor)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const [accounts, expenses, inputs] = await Promise.all([
    prisma.bankAccount.findMany({ where: { active: true }, select: { lastAvailableBalance: true } }),
    prisma.expensePlan.findMany({ where: { OR: [{ status: { in: ["submitted", "approved"] } }, { status: "paid", recurrence: { not: "one_time" } }] }, select: { amount: true, plannedDate: true, recurrence: true } }),
    prisma.forecastInput.findMany({ where: { active: true }, select: { amount: true, effectiveDate: true, endDate: true, direction: true, scenario: true, recurrence: true } }),
  ]);
  const months = nextMonths(6);
  const openingBalance = accounts.reduce((sum, account) => sum + (account.lastAvailableBalance ?? BigInt(0)), BigInt(0));
  const expenseOutflows = expenses.flatMap((expense) => expandCashFlow(months, expense.plannedDate, expense.amount, expense.recurrence));
  const base: ForecastInput = {
    openingBalance,
    months,
    plannedOutflows: [...expenseOutflows, ...scenarioFlows(months, inputs, "base", "outflow")],
    expectedInflows: scenarioFlows(months, inputs, "base", "inflow"),
    optimisticInflows: scenarioFlows(months, inputs, "optimistic", "inflow"),
    conservativeInflows: scenarioFlows(months, inputs, "conservative", "inflow"),
    optimisticOutflows: [...expenseOutflows, ...scenarioFlows(months, inputs, "optimistic", "outflow")],
    conservativeOutflows: [...expenseOutflows, ...scenarioFlows(months, inputs, "conservative", "outflow")],
  };
  return NextResponse.json(serializeBigInt({ openingBalance, months: buildAllScenarios(base), recommendations: openingBalance < BigInt(0) ? ["Saldo awal kas negatif. Review kebutuhan dana segera."] : [] }));
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!canManageExpenses(actor)) return NextResponse.json({ error: "Hanya Finance yang dapat mengubah asumsi forecast" }, { status: 403 });
  const parsed = forecastInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Input forecast tidak valid", details: parsed.error.flatten() }, { status: 400 });
  const input = await prisma.forecastInput.create({ data: { ...parsed.data, amount: BigInt(parsed.data.amount), createdById: actor.id } });
  return NextResponse.json(serializeBigInt({ input }), { status: 201 });
}
