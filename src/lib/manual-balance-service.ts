import { z } from "zod";

export const manualBalanceSchema = z.object({
  availableBalance: z.number().int().nonnegative().safe(),
  note: z.string().max(500).optional(),
});

export type ManualBalanceInput = z.infer<typeof manualBalanceSchema>;

export function validateManualBalanceInput(input: unknown): ManualBalanceInput {
  return manualBalanceSchema.parse(input);
}
