import { NextResponse } from "next/server";
import { getCurrentActor, roleCookieName, secureRoleCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [actor, users] = await Promise.all([
      getCurrentActor(),
      prisma.user.findMany({ where: { active: true }, orderBy: { role: "asc" }, select: { id: true, name: true, role: true, email: true, active: true } }),
    ]);
    return NextResponse.json({ actor, users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Session unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== "true") return NextResponse.json({ error: "Production authentication is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const role = body.role === "FINANCE" ? "FINANCE" : body.role === "CEO" ? "CEO" : null;
  if (!role) return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(roleCookieName(), role, { httpOnly: true, sameSite: "lax", secure: secureRoleCookie(request), path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
