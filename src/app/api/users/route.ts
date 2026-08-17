import { NextResponse } from "next/server";
import { canManageUsers, getCurrentActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/validation";

const userSelect = { id: true, name: true, email: true, role: true, active: true } as const;

export async function GET() {
  const actor = await getCurrentActor();
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Hanya CEO yang dapat mengelola login account" }, { status: 403 });
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], select: userSelect });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Hanya CEO yang dapat menambah login account" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data user tidak valid", details: parsed.error.flatten() }, { status: 400 });
  try {
    const user = await prisma.user.create({ data: { ...parsed.data, active: true }, select: userSelect });
    await prisma.auditLog.create({ data: { userId: actor.id, action: "user_created", entityType: "User", entityId: user.id, metadata: { role: user.role, email: user.email } } });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Email user sudah terdaftar" }, { status: 409 });
    return NextResponse.json({ error: "User gagal dibuat" }, { status: 500 });
  }
}
