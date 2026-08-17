import { NextResponse } from "next/server";

const disabled = () => NextResponse.json({ error: "Automatic bank balance retrieval is disabled. Enter balances manually in the Accounts view." }, { status: 410 });

export function GET() {
  return disabled();
}

export function POST() {
  return disabled();
}
