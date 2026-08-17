import assert from "node:assert/strict";
import test from "node:test";
import {
  expenseCategories,
  expenseStatuses,
  isFinalExpenseStatus,
  isValidAvailableBalance,
  isValidIdrAmount,
} from "../../src/lib/domain";

test("expense workflow has exactly the requested statuses", () => {
  assert.deepEqual(expenseStatuses, ["submitted", "approved", "paid"]);
  assert.equal(isFinalExpenseStatus("paid"), true);
});

test("expense categories include all PT TKI office categories", () => {
  assert.deepEqual(expenseCategories, ["payroll", "vendors", "infrastructure", "taxes", "employee_bonus", "other"]);
});

test("IDR amount validation rejects negative and fractional values", () => {
  assert.equal(isValidIdrAmount(100000), true);
  assert.equal(isValidIdrAmount(0), true);
  assert.equal(isValidIdrAmount(-1), false);
  assert.equal(isValidIdrAmount(100.5), false);
});

test("available balance must be a non-negative integer in IDR", () => {
  assert.equal(isValidAvailableBalance(500000), true);
  assert.equal(isValidAvailableBalance(-500000), false);
  assert.equal(isValidAvailableBalance(10.2), false);
});
