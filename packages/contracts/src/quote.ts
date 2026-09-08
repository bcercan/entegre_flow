import { z } from "zod";
import { moneySchema, currencySchema } from "./common";

/** A line in a quote/draft. Amounts are server-computed, never model-set. */
export const quoteLineSchema = z.object({
  sku: z.string(),
  name: z.string(),
  qty: z.number().int().positive(),
  unit: z.string(),
  unitPrice: moneySchema, // deal price
  lineTotal: moneySchema, // qty * unitPrice
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const quoteTotalsSchema = z.object({
  net: moneySchema, // KDV hariç
  currency: currencySchema,
});
export type QuoteTotals = z.infer<typeof quoteTotalsSchema>;

export const quoteDraftStatusSchema = z.enum(["draft", "approved", "discarded"]);
export type QuoteDraftStatus = z.infer<typeof quoteDraftStatusSchema>;

/** Editable, versioned draft prior to human approval. */
export const quoteDraftSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  threadId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  bodyText: z.string(),
  lines: z.array(quoteLineSchema),
  totals: quoteTotalsSchema,
  version: z.number().int(),
  status: quoteDraftStatusSchema,
});
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export const quoteStatusSchema = z.enum(["queued", "sent", "failed"]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

/** Immutable snapshot, created on approval. ERP order push validates against this only. */
export const quoteSchema = z.object({
  id: z.string().uuid(),
  number: z.string(), // per-tenant sequence
  draftId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  lines: z.array(quoteLineSchema),
  totals: quoteTotalsSchema,
  validUntil: z.string(), // ISO date
  status: quoteStatusSchema,
  sentAt: z.string().nullable(),
  providerMessageId: z.string().nullable(),
});
export type Quote = z.infer<typeof quoteSchema>;
