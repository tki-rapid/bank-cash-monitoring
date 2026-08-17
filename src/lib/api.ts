import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T) {
  return NextResponse.json(data);
}

export function serializeBigInt<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, current) => typeof current === "bigint" ? current.toString() : current));
}
