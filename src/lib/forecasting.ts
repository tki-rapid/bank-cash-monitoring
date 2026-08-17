export type CashFlow = { month: string; amount: bigint };
export type ForecastInput = {
  openingBalance: bigint;
  months: string[];
  plannedOutflows: CashFlow[];
  expectedInflows: CashFlow[];
  optimisticInflows?: CashFlow[];
  conservativeInflows?: CashFlow[];
  optimisticOutflows?: CashFlow[];
  conservativeOutflows?: CashFlow[];
};
export type ForecastMonth = { month: string; openingBalance: bigint; inflows: bigint; outflows: bigint; closingBalance: bigint };

function sumForMonth(items: CashFlow[], month: string): bigint {
  return items.filter((item) => item.month === month).reduce((sum, item) => sum + item.amount, BigInt(0));
}

export function buildSixMonthForecast(input: ForecastInput): { months: ForecastMonth[] } {
  let balance = input.openingBalance;
  const months = input.months.map((month) => {
    const inflows = sumForMonth(input.expectedInflows, month);
    const outflows = sumForMonth(input.plannedOutflows, month);
    const openingBalance = balance;
    balance = openingBalance + inflows - outflows;
    return { month, openingBalance, inflows, outflows, closingBalance: balance };
  });
  return { months };
}

export function buildAllScenarios(input: ForecastInput) {
  return {
    base: buildSixMonthForecast(input),
    optimistic: buildSixMonthForecast({ ...input, expectedInflows: input.optimisticInflows ?? input.expectedInflows, plannedOutflows: input.optimisticOutflows ?? input.plannedOutflows }),
    conservative: buildSixMonthForecast({ ...input, expectedInflows: input.conservativeInflows ?? input.expectedInflows, plannedOutflows: input.conservativeOutflows ?? input.plannedOutflows }),
  };
}
