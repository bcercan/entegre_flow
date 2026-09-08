import { z } from "zod";

/** Currencies handled by the quoting engine. */
export const currencySchema = z.enum(["TRY", "USD", "EUR"]);
export type Currency = z.infer<typeof currencySchema>;

/**
 * Money as integer minor units (e.g. kuruş for TRY) — never a float.
 * This eliminates rounding drift across ERP → analysis → quote → invoice.
 */
export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

export const uuidSchema = z.string().uuid();

/** Roles within a tenant (descending privilege). */
export const roleSchema = z.enum(["owner", "admin", "agent", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

/** Cursor pagination — opaque cursor, server-defined. */
export const paginationSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export type Pagination = z.infer<typeof paginationSchema>;

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

/** Stock availability state, derived from requested qty vs on-hand. */
export const stockStateSchema = z.enum(["ok", "low", "out"]);
export type StockState = z.infer<typeof stockStateSchema>;

/** Customer credit risk, derived from balance vs limit. */
export const riskSchema = z.enum(["ok", "warn", "danger"]);
export type Risk = z.infer<typeof riskSchema>;
