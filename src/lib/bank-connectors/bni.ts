import type { BankPortalConnector } from "@/lib/bank-connectors/types";

export class BniConnector implements BankPortalConnector {
  readonly portalKey = "bni";

  async start(_runId: string): Promise<void> {
    // The Hermes Computer Use worker owns browser interaction. This server-side
    // contract deliberately never receives credentials or browser sessions.
  }

  async cancel(_runId: string): Promise<void> {
    // Cancellation is sent to the worker boundary in the production adapter.
  }
}
