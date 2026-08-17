import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { authOptions, googleAuthConfigured } from "@/lib/google-auth";

export type DemoRole = "CEO" | "FINANCE";
export type Actor = { id: string; name: string; email: string; role: DemoRole; active: boolean };

const roleCookie = "tki_cash_demo_role";

function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function getCurrentActor(): Promise<Actor> {
  if (googleAuthConfigured()) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) throw new Error("Google login is required");
    const actor = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, role: true, active: true } });
    if (!actor?.active) throw new Error("Akun belum diaktifkan oleh CEO");
    return actor as Actor;
  }
  if (!demoModeEnabled()) throw new Error("Google authentication is not configured. Set up Google OAuth before exposure.");
  const cookieStore = await cookies();
  const requestedRole = cookieStore.get(roleCookie)?.value;
  const role: DemoRole = requestedRole === "FINANCE" ? "FINANCE" : "CEO";
  const actor = await prisma.user.findFirst({ where: { role, active: true }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!actor) throw new Error("No active demo actor is available. Run the database seed.");
  return actor as Actor;
}

export function roleCookieName(): string {
  return roleCookie;
}

export function secureRoleCookie(request: Request): boolean {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol ?? new URL(request.url).protocol.replace(":", "");
  return protocol === "https";
}

export function canReadFinancialData(actor: Pick<Actor, "role" | "active">): boolean {
  return actor.active && (actor.role === "CEO" || actor.role === "FINANCE");
}

export function canManageExpenses(actor: Pick<Actor, "role" | "active">): boolean {
  return actor.active && actor.role === "FINANCE";
}

export function canManageUsers(actor: Pick<Actor, "role" | "active">): boolean {
  return actor.active && actor.role === "CEO";
}
