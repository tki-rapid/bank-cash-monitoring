import assert from "node:assert/strict";
import test from "node:test";
import { buildAllScenarios, buildSixMonthForecast } from "../../src/lib/forecasting";

test("base forecast includes balance, inflows, and outflows", () => {
  const result = buildSixMonthForecast({
    openingBalance: BigInt(100000000),
    months: ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"],
    plannedOutflows: [{ month: "2026-09", amount: BigInt(30000000) }],
    expectedInflows: [{ month: "2026-09", amount: BigInt(50000000) }],
  });
  assert.equal(result.months.length, 6);
  assert.equal(result.months[0].closingBalance, BigInt(120000000));
});

test("scenario-specific inflows and outflows stay separate", () => {
  const result = buildAllScenarios({
    openingBalance: BigInt(100),
    months: ["2026-09"],
    plannedOutflows: [{ month: "2026-09", amount: BigInt(10) }],
    expectedInflows: [{ month: "2026-09", amount: BigInt(20) }],
    optimisticInflows: [{ month: "2026-09", amount: BigInt(50) }],
    conservativeInflows: [{ month: "2026-09", amount: BigInt(5) }],
    optimisticOutflows: [{ month: "2026-09", amount: BigInt(3) }],
    conservativeOutflows: [{ month: "2026-09", amount: BigInt(30) }],
  });
  assert.equal(result.base.months[0].closingBalance, BigInt(110));
  assert.equal(result.optimistic.months[0].closingBalance, BigInt(147));
  assert.equal(result.conservative.months[0].closingBalance, BigInt(75));
});
