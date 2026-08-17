import assert from "node:assert/strict";
import test from "node:test";
import { validateManualBalanceInput } from "../../src/lib/manual-balance-service";

test("manual balance accepts a non-negative integer IDR amount", () => {
  assert.deepEqual(
    validateManualBalanceInput({ availableBalance: 125000000, note: "Saldo dicek melalui rekening koran" }),
    { availableBalance: 125000000, note: "Saldo dicek melalui rekening koran" },
  );
});

test("manual balance rejects negative, fractional, or unsafe amounts", () => {
  assert.throws(() => validateManualBalanceInput({ availableBalance: -1 }));
  assert.throws(() => validateManualBalanceInput({ availableBalance: 100.5 }));
  assert.throws(() => validateManualBalanceInput({ availableBalance: Number.MAX_SAFE_INTEGER + 1 }));
});
