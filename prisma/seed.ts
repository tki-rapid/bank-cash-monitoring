import { PrismaClient, AppRole, BalanceSource, ExpenseCategory, ExpenseRecurrence, ExpenseStatus, ForecastScenario, CashFlowDirection } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureForecastInput(input: { title: string; direction: CashFlowDirection; amount: bigint; scenario: ForecastScenario; recurrence: ExpenseRecurrence; effectiveDate: Date; createdById: string }) {
  const existing = await prisma.forecastInput.findFirst({ where: { title: input.title, scenario: input.scenario } });
  if (!existing) await prisma.forecastInput.create({ data: input });
}

async function main() {
  const ceo = await prisma.user.upsert({ where: { email: "ceo@pt-tki.internal" }, update: { active: true, role: AppRole.CEO }, create: { email: "ceo@pt-tki.internal", name: "CEO PT TKI", role: AppRole.CEO, active: true } });
  const arif = await prisma.user.upsert({ where: { email: "arifarinto@gmail.com" }, update: { name: "Arif Arinto", role: AppRole.CEO, active: true }, create: { email: "arifarinto@gmail.com", name: "Arif Arinto", role: AppRole.CEO, active: true } });
  const finance = await prisma.user.upsert({ where: { email: "finance@pt-tki.internal" }, update: { active: true, role: AppRole.FINANCE }, create: { email: "finance@pt-tki.internal", name: "Finance PT TKI", role: AppRole.FINANCE, active: true } });
  const bni = await prisma.bankInstitution.upsert({ where: { code: "BNI" }, update: {}, create: { code: "BNI", name: "Bank Negara Indonesia", portalKey: "bni" } });
  const bri = await prisma.bankInstitution.upsert({ where: { code: "BRI" }, update: {}, create: { code: "BRI", name: "Bank Rakyat Indonesia", portalKey: "bri" } });
  const bniAccount = await prisma.bankAccount.upsert({ where: { id: "seed-bni-operational" }, update: {}, create: { id: "seed-bni-operational", bankInstitutionId: bni.id, displayName: "BNI Operasional", accountNumber: "000000000001", currency: "IDR", lastAvailableBalance: BigInt(325000000), lastCapturedAt: new Date(), lastBalanceSource: BalanceSource.manual } });
  await prisma.bankAccount.upsert({ where: { id: "seed-bri-payroll" }, update: {}, create: { id: "seed-bri-payroll", bankInstitutionId: bri.id, displayName: "BRI Payroll", accountNumber: "000000000002", currency: "IDR", lastAvailableBalance: BigInt(185000000), lastCapturedAt: new Date(), lastBalanceSource: BalanceSource.manual } });
  const snapshotCount = await prisma.balanceSnapshot.count({ where: { bankAccountId: bniAccount.id } });
  if (snapshotCount === 0) await prisma.balanceSnapshot.create({ data: { bankAccountId: bniAccount.id, source: BalanceSource.manual, availableBalance: BigInt(325000000), capturedAt: new Date(), accountNumberAtCapture: "000000000001", enteredById: finance.id, note: "Seed demo balance" } });
  await prisma.expensePlan.upsert({ where: { code: "EXP-SEED-PAYROLL" }, update: {}, create: { code: "EXP-SEED-PAYROLL", title: "Payroll September", category: ExpenseCategory.payroll, amount: BigInt(95000000), recurrence: ExpenseRecurrence.monthly, plannedDate: new Date("2026-09-25"), status: ExpenseStatus.approved, createdById: finance.id, approvedById: ceo.id, approvedAt: new Date() } });
  await prisma.expensePlan.upsert({ where: { code: "EXP-SEED-INFRA" }, update: {}, create: { code: "EXP-SEED-INFRA", title: "Cloud and infrastructure", category: ExpenseCategory.infrastructure, amount: BigInt(18000000), recurrence: ExpenseRecurrence.monthly, plannedDate: new Date("2026-09-10"), status: ExpenseStatus.submitted, createdById: finance.id } });
  await prisma.expensePlan.upsert({ where: { code: "EXP-SEED-TAX" }, update: {}, create: { code: "EXP-SEED-TAX", title: "Monthly tax payment", category: ExpenseCategory.taxes, amount: BigInt(22000000), recurrence: ExpenseRecurrence.monthly, plannedDate: new Date("2026-09-15"), status: ExpenseStatus.paid, createdById: finance.id, approvedById: ceo.id, approvedAt: new Date(), paidAt: new Date() } });
  await ensureForecastInput({ title: "Expected school receipts", direction: CashFlowDirection.inflow, amount: BigInt(140000000), scenario: ForecastScenario.base, recurrence: ExpenseRecurrence.monthly, effectiveDate: new Date("2026-09-01"), createdById: finance.id });
  await ensureForecastInput({ title: "Conservative receipts", direction: CashFlowDirection.inflow, amount: BigInt(100000000), scenario: ForecastScenario.conservative, recurrence: ExpenseRecurrence.monthly, effectiveDate: new Date("2026-09-01"), createdById: finance.id });
  await ensureForecastInput({ title: "Optimistic receipts", direction: CashFlowDirection.inflow, amount: BigInt(180000000), scenario: ForecastScenario.optimistic, recurrence: ExpenseRecurrence.monthly, effectiveDate: new Date("2026-09-01"), createdById: finance.id });
  console.log(`Seeded ${ceo.name}, ${arif.name}, ${finance.name}, and ${bni.name} without deleting existing records.`);
}

main().finally(() => prisma.$disconnect());
