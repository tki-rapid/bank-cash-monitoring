export const expenseCategories = [
  "payroll",
  "vendors",
  "infrastructure",
  "taxes",
  "employee_bonus",
  "other",
] as const;

export const expenseStatuses = ["submitted", "approved", "paid"] as const;
export const forecastScenarios = ["base", "optimistic", "conservative"] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];
export type ExpenseStatus = (typeof expenseStatuses)[number];
export type ForecastScenario = (typeof forecastScenarios)[number];

export function isFinalExpenseStatus(status: ExpenseStatus): boolean {
  return status === "paid";
}

export function isValidIdrAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function isValidAvailableBalance(value: number): boolean {
  return isValidIdrAmount(value);
}
