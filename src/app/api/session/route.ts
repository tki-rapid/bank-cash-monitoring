import { NextResponse } from "next/server";
import { getCurrentActor, roleCookieName, secureRoleCookie } from "@/lib/auth";
import { googleAuthConfigured } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const googleConfigured = googleAuthConfigured();
  try {
    const actor = await getCurrentActor();
    return NextResponse.json({ actor, authMode: googleConfigured ? "google" : "demo", googleConfigured });
  } catch (error) {
    return NextResponse.json({ actor: null, authMode: googleConfigured ? "google" : "demo", googleConfigured, error: error instanceof Error ? error.message : "Login diperlukan" });
  }
}

export async function POST(request: Request) {
  if (googleAuthConfigured()) return NextResponse.json({ error: "Role is controlled by the Google login account" }, { status: 403 });
  if (process.env.DEMO_MODE !== "true") return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const role = body.role === "FINANCE" ? "FINANCE" : body.role === "CEO" ? "CEO" : null;
  if (!role) return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(roleCookieName(), role, { httpOnly: true, sameSite: "lax", secure: secureRoleCookie(request), path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
