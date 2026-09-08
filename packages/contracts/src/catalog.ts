import { z } from "zod";
import { moneySchema, stockStateSchema } from "./common";

/** A product in the catalog — the shape every ERP adapter maps into. */
export const catalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string(),
  name: z.string(),
  unit: z.string(), // "adet", "çift", ...
  /** Free-form attributes (CE standard, icon key, aliases for matching). */
  attributes: z.record(z.unknown()).default({}),
});
export type CatalogItem = z.infer<typeof catalogItemSchema>;

/** Stock level for a SKU at a point in time. */
export const stockLevelSchema = z.object({
  sku: z.string(),
  qty: z.number().int(),
  state: stockStateSchema,
  capturedAt: z.string().nullable(),
});
export type StockLevel = z.infer<typeof stockLevelSchema>;

/** Price quote for a SKU (list vs deal), optionally customer-specific. */
export const priceQuoteSchema = z.object({
  sku: z.string(),
  list: moneySchema,
  deal: moneySchema,
  customerCode: z.string().nullable(),
  fetchedAt: z.string().nullable(),
});
export type PriceQuote = z.infer<typeof priceQuoteSchema>;
