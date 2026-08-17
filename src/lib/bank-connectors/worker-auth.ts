import { timingSafeEqual } from "node:crypto";

export function isAuthorizedWorkerRequest(request: Request): boolean {
  const configured = process.env.COMPUTER_USE_WORKER_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || configured.startsWith("replace-with-") || configured.length < 32 || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
