import { z } from "zod";
import { moneySchema, riskSchema } from "./common";

/** Normalized customer (cari) — the shape every ERP adapter maps into. */
export const customerSchema = z.object({
  id: z.string().uuid().optional(), // local id; absent for not-yet-mirrored ERP rows
  erpCode: z.string(), // e.g. "120.01.0045"
  name: z.string(),
  segment: z.string().nullable(),
  balance: moneySchema, // open balance (borç)
  creditLimit: moneySchema,
  paymentTerm: z.string().nullable(), // e.g. "60 gün", "Peşin"
  lastOrderAt: z.string().nullable(), // ISO date
  risk: riskSchema,
  /** true when balance exceeds limit — surfaced as a danger warning. */
  overLimit: z.boolean(),
  syncedAt: z.string().nullable(),
});
export type Customer = z.infer<typeof customerSchema>;

/** A single past order line in the customer's history (cari hareket). */
export const orderHistoryEntrySchema = z.object({
  date: z.string(), // ISO date
  description: z.string(),
  amount: moneySchema,
});
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>;
