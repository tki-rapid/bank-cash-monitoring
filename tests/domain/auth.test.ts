import assert from "node:assert/strict";
import test from "node:test";
import { canManageExpenses, canReadFinancialData, secureRoleCookie } from "../../src/lib/auth";

test("CEO and Finance can read financial data", () => {
  assert.equal(canReadFinancialData({ role: "CEO", active: true }), true);
  assert.equal(canReadFinancialData({ role: "FINANCE", active: true }), true);
  assert.equal(canReadFinancialData({ role: "FINANCE", active: false }), false);
});

test("only Finance manages expenses", () => {
  assert.equal(canManageExpenses({ role: "FINANCE", active: true }), true);
  assert.equal(canManageExpenses({ role: "CEO", active: true }), false);
});

test("role cookie is Secure only when the request is HTTPS", () => {
  assert.equal(secureRoleCookie(new Request("http://10.10.0.7:10005/api/auth/session")), false);
  assert.equal(secureRoleCookie(new Request("https://cash.internal/api/auth/session")), true);
  assert.equal(secureRoleCookie(new Request("http://cash.internal/api/auth/session", { headers: { "x-forwarded-proto": "https" } })), true);
});
