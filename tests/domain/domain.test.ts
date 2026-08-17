import assert from "node:assert/strict";
import test from "node:test";
import {
  expenseCategories,
  expenseStatuses,
  isFinalExpenseStatus,
  isValidAvailableBalance,
  isValidIdrAmount,
} from "../../src/lib/domain";
import { createAccountSchema, userCreateSchema, userUpdateSchema } from "../../src/lib/validation";

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

test("manual bank-account registration accepts numeric account details only", () => {
  assert.equal(createAccountSchema.safeParse({ bankInstitutionId: "bank-1", displayName: "BNI Operasional", accountNumber: "1234 5678" }).success, true);
  assert.equal(createAccountSchema.safeParse({ bankInstitutionId: "bank-1", displayName: "BNI Operasional", accountNumber: "account-name" }).success, false);
});

test("user management validates Google login accounts", () => {
  const created = userCreateSchema.parse({ name: "Arif Arinto", email: "ARIFARINTO@GMAIL.COM", role: "CEO" });
  assert.equal(created.email, "arifarinto@gmail.com");
  assert.equal(userUpdateSchema.safeParse({ active: false }).success, true);
  assert.equal(userUpdateSchema.safeParse({}).success, false);
});
