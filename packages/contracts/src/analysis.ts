import { z } from "zod";
import { moneySchema, stockStateSchema } from "./common";
import { orderHistoryEntrySchema } from "./customer";

/** Warning severity. */
export const warningSchema = z.object({
  type: z.enum(["warn", "danger"]),
  title: z.string(),
  detail: z.string(),
});
export type Warning = z.infer<typeof warningSchema>;

// ----------------------------------------------------------------------------
// 1) AI OUTPUT — exactly what Claude returns (tool-use forced JSON).
//    Prices/stock/risk are intentionally ABSENT here: the model never sets them.
//    `matchedSku` is hard-validated against the server-supplied candidate set
//    before persistence (prompt-injection defense).
// ----------------------------------------------------------------------------
export const aiLineItemSchema = z.object({
  requestText: z.string(),
  qty: z.number().nullable(),
  unit: z.string().nullable(),
  matchedSku: z.string().nullable(),
  matchConfidence: z.number().min(0).max(1),
  ambiguous: z.boolean(),
});
export type AiLineItem = z.infer<typeof aiLineItemSchema>;

export const aiAnalysisSchema = z.object({
  summary: z.string(),
  intents: z.array(z.string()),
  draftBody: z.string(), // prose; contains the [TEKLİF TABLOSU] placeholder
  lineItems: z.array(aiLineItemSchema),
  warnings: z.array(warningSchema),
});
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

// ----------------------------------------------------------------------------
// 2) ENRICHED ANALYSIS — server-built, what the UI binds to.
//    Each line is enriched with stock/price from the local ERP cache and a
//    deterministic billable total. Warnings include server-computed risk.
// ----------------------------------------------------------------------------
export const analysisLineSchema = z.object({
  requestText: z.string(),
  matchedSku: z.string().nullable(),
  name: z.string(), // resolved catalog name or echo of requestText
  unit: z.string(),
  qty: z.number(), // 0 = "list only" (price inquiry, no concrete qty)
  list: moneySchema.nullable(),
  deal: moneySchema.nullable(),
  stock: z.number().int().nullable(),
  stockState: stockStateSchema.nullable(),
  matchConfidence: z.number().min(0).max(1),
  /** Low-confidence / ambiguous lines are a first-class rep-resolved state. */
  ambiguous: z.boolean(),
  /** Optional substitution / shortfall note (e.g. alternative SKU). */
  note: z.string().nullable(),
});
export type AnalysisLine = z.infer<typeof analysisLineSchema>;

export const tokenCostSchema = z.object({
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
});
export type TokenCost = z.infer<typeof tokenCostSchema>;

export const messageAnalysisSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  model: z.string(),
  promptVersion: z.string(),
  summary: z.string(),
  intents: z.array(z.string()),
  lines: z.array(analysisLineSchema),
  warnings: z.array(warningSchema),
  history: z.array(orderHistoryEntrySchema),
  draftText: z.string(),
  tokenCost: tokenCostSchema,
  createdAt: z.string(),
});
export type MessageAnalysis = z.infer<typeof messageAnalysisSchema>;
