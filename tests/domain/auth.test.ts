import assert from "node:assert/strict";
import test from "node:test";
import { canManageExpenses, canReadFinancialData } from "../../src/lib/auth";

test("CEO and Finance can read financial data", () => {
  assert.equal(canReadFinancialData({ role: "CEO", active: true }), true);
  assert.equal(canReadFinancialData({ role: "FINANCE", active: true }), true);
  assert.equal(canReadFinancialData({ role: "FINANCE", active: false }), false);
});

test("only Finance manages expenses", () => {
  assert.equal(canManageExpenses({ role: "FINANCE", active: true }), true);
  assert.equal(canManageExpenses({ role: "CEO", active: true }), false);
});
