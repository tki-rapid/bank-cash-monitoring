import { BniConnector } from "@/lib/bank-connectors/bni";
import type { BankPortalConnector } from "@/lib/bank-connectors/types";

const connectors: Record<string, BankPortalConnector> = { bni: new BniConnector() };

export function getBankConnector(portalKey: string): BankPortalConnector | null {
  return Object.prototype.hasOwnProperty.call(connectors, portalKey) ? connectors[portalKey] : null;
}
