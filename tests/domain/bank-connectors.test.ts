import assert from "node:assert/strict";
import test from "node:test";
import { getBankConnector } from "../../src/lib/bank-connectors/registry";
import { validateComputerUseResult } from "../../src/lib/bank-connectors/types";

test("BNI connector is registered without credential fields", () => {
  assert.equal(getBankConnector("bni")?.portalKey, "bni");
  assert.equal(getBankConnector("unknown"), null);
});

test("computer-use result accepts only IDR balance and account number", () => {
  const result = validateComputerUseResult({ availableBalance: 125000000, accountNumber: "0001" });
  assert.equal(result.availableBalance, 125000000);
  assert.equal(result.accountNumber, "0001");
  assert.throws(() => validateComputerUseResult({ availableBalance: -1, accountNumber: "0001" }));
});
