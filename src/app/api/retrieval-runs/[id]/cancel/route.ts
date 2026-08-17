import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "Computer Use balance updates are disabled. Enter balances manually in the Accounts view." }, { status: 410 });
}
