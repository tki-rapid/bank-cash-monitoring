import { NextResponse } from "next/server";
import { canManageUsers, getCurrentActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validation";

const userSelect = { id: true, name: true, email: true, role: true, active: true } as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentActor();
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Hanya CEO yang dapat mengubah login account" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Perubahan user tidak valid", details: parsed.error.flatten() }, { status: 400 });
  const current = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!current) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  const leavingCeoPool = current.role === "CEO" && current.active && (parsed.data.role === "FINANCE" || parsed.data.active === false);
  if (leavingCeoPool && await prisma.user.count({ where: { role: "CEO", active: true } }) <= 1) return NextResponse.json({ error: "Tidak dapat menonaktifkan atau menurunkan CEO terakhir" }, { status: 400 });
  if (actor.id === id && parsed.data.active === false) return NextResponse.json({ error: "Anda tidak dapat menonaktifkan akun sendiri" }, { status: 400 });
  const user = await prisma.user.update({ where: { id }, data: parsed.data, select: userSelect });
  await prisma.auditLog.create({ data: { userId: actor.id, action: "user_updated", entityType: "User", entityId: id, metadata: { from: { role: current.role, active: current.active }, to: { role: user.role, active: user.active } } } });
  return NextResponse.json({ user });
}
