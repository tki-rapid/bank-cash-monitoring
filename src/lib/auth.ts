import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type DemoRole = "CEO" | "FINANCE";
export type Actor = { id: string; name: string; email: string; role: DemoRole; active: boolean };

const roleCookie = "tki_cash_demo_role";

function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function getCurrentActor(): Promise<Actor> {
  if (!demoModeEnabled()) throw new Error("Production authentication is not configured. Set up PT TKI authentication before exposure.");
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

export function canReadFinancialData(actor: Pick<Actor, "role" | "active">): boolean {
  return actor.active && (actor.role === "CEO" || actor.role === "FINANCE");
}

export function canManageExpenses(actor: Pick<Actor, "role" | "active">): boolean {
  return actor.active && actor.role === "FINANCE";
}
