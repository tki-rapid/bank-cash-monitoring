export type BankRunEvent =
  | { type: "awaiting_user_login"; message: string }
  | { type: "awaiting_captcha"; message: string }
  | { type: "extracting"; message: string }
  | { type: "succeeded"; availableBalance: number; accountNumber: string; capturedAt: string }
  | { type: "failed"; errorCode: string; message: string };

export interface BankPortalConnector {
  readonly portalKey: string;
  start(runId: string): Promise<void>;
  cancel(runId: string): Promise<void>;
}

export function validateComputerUseResult(input: unknown): { availableBalance: number; accountNumber: string; capturedAt: Date } {
  if (!input || typeof input !== "object") throw new Error("Hasil bank tidak valid");
  const result = input as Record<string, unknown>;
  if (typeof result.availableBalance !== "number" || !Number.isSafeInteger(result.availableBalance) || result.availableBalance < 0) throw new Error("Saldo bank tidak valid");
  if (typeof result.accountNumber !== "string" || !/^[0-9 -]{4,40}$/.test(result.accountNumber) || !/\d/.test(result.accountNumber)) throw new Error("Nomor rekening tidak valid");
  return { availableBalance: result.availableBalance, accountNumber: result.accountNumber, capturedAt: new Date() };
}
