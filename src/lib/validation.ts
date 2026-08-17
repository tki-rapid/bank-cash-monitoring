import { z } from "zod";

export const createAccountSchema = z.object({
  bankInstitutionId: z.string().min(1),
  displayName: z.string().min(2).max(100),
  accountNumber: z.string().min(4).max(40).regex(/^[0-9 -]+$/).refine((value) => /\d/.test(value), "Nomor rekening harus berisi angka"),
});

export const createExpenseSchema = z.object({
  title: z.string().min(2).max(160),
  category: z.enum(["payroll", "vendors", "infrastructure", "taxes", "employee_bonus", "other"]),
  amount: z.number().int().nonnegative().safe(),
  recurrence: z.enum(["one_time", "monthly", "quarterly", "annual"]),
  plannedDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
});

export const manualBalanceSchema = z.object({
  availableBalance: z.number().int().nonnegative().safe(),
  note: z.string().max(500).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  role: z.enum(["CEO", "FINANCE"]),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(["CEO", "FINANCE"]).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const forecastInputSchema = z.object({
  title: z.string().min(2).max(160),
  direction: z.enum(["inflow", "outflow"]),
  amount: z.number().int().nonnegative().safe(),
  scenario: z.enum(["base", "optimistic", "conservative"]),
  recurrence: z.enum(["one_time", "monthly", "quarterly", "annual"]),
  effectiveDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const createRetrievalRunSchema = z.object({ bankAccountId: z.string().min(1) });
