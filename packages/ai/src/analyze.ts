import type {
  AnalysisLine,
  Customer,
  Money,
  OrderHistoryEntry,
  StockState,
  Warning,
} from "@entegreflow/contracts";
import type { LlmProvider, RfqCandidate } from "./provider";
import type { AiCostGuard } from "./cost-guard";

export const PROMPT_VERSION = "rfq-analysis-v1";

/** Server-side catalog access. Reads the local ERP cache (never the live ERP). */
export interface CatalogPort {
  /** Retrieve candidate SKUs relevant to the request text. */
  candidates(text: string): Promise<RfqCandidate[]>;
  /** Enrich a matched SKU with cached price/stock (server-authoritative). */
  enrich(
    sku: string,
    customerCode: string | null,
  ): Promise<{
    name: string;
    unit: string;
    list: Money | null;
    deal: Money | null;
    stock: number | null;
    stockState: StockState | null;
  } | null>;
}

export interface AnalyzeDeps {
  llm: LlmProvider;
  catalog: CatalogPort;
  costGuard?: AiCostGuard;
}

export interface AnalyzeMessageInput {
  tenantId: string;
  subject: string;
  body: string;
  customer: Customer | null;
  history?: OrderHistoryEntry[];
  companyName?: string;
}

export interface AnalyzeMessageResult {
  summary: string;
  intents: string[];
  lines: AnalysisLine[];
  warnings: Warning[];
  history: OrderHistoryEntry[];
  draftText: string;
  model: string;
  promptVersion: string;
  tokenCost: { inputTokens: number; outputTokens: number };
}

/**
 * The analysis engine. LLM extracts intent + line items (SKU-constrained);
 * the SERVER enriches each line with cached stock/price and computes credit/
 * stock/ambiguity warnings DETERMINISTICALLY. The model never sets money/stock.
 */
export async function analyzeMessage(
  input: AnalyzeMessageInput,
  deps: AnalyzeDeps,
): Promise<AnalyzeMessageResult> {
  if (deps.costGuard) await deps.costGuard.assertWithinBudget(input.tenantId);

  const candidates = await deps.catalog.candidates(`${input.subject}\n${input.body}`);
  const customerCode = input.customer?.erpCode ?? null;

  const { analysis, usage } = await deps.llm.analyzeRfq({
    subject: input.subject,
    body: input.body,
    candidates,
    companyName: input.companyName,
    customer: input.customer
      ? {
          name: input.customer.name,
          segment: input.customer.segment,
          paymentTerm: input.customer.paymentTerm,
          overLimit: input.customer.overLimit,
        }
      : null,
  });

  if (deps.costGuard) await deps.costGuard.record(input.tenantId, usage);

  const allowed = new Set(candidates.map((c) => c.sku));
  const lines: AnalysisLine[] = [];

  for (const li of analysis.lineItems) {
    // Hard re-validate matchedSku against the server candidate set.
    const sku = li.matchedSku && allowed.has(li.matchedSku) ? li.matchedSku : null;
    let name = li.requestText;
    let unit = li.unit ?? "adet";
    let list: Money | null = null;
    let deal: Money | null = null;
    let stock: number | null = null;
    let stockState: StockState | null = null;

    if (sku) {
      const e = await deps.catalog.enrich(sku, customerCode);
      if (e) {
        name = e.name;
        unit = e.unit;
        list = e.list;
        deal = e.deal;
        stock = e.stock;
        stockState = e.stockState;
      }
    }

    const qty = li.qty ?? 0;
    const shortfall = sku && qty > 0 && stock !== null && stock < qty ? qty - stock : 0;

    lines.push({
      requestText: li.requestText,
      matchedSku: sku,
      name,
      unit,
      qty,
      list,
      deal,
      stock,
      stockState,
      matchConfidence: li.matchConfidence,
      ambiguous: li.ambiguous || !sku,
      note: shortfall > 0 ? `Stok ${stock} ${unit} — ${shortfall} ${unit} eksik.` : null,
    });
  }

  const warnings = computeWarnings(input.customer, lines);

  return {
    summary: analysis.summary,
    intents: analysis.intents,
    lines,
    warnings,
    history: input.history ?? [],
    draftText: analysis.draftBody,
    model: deps.llm.model,
    promptVersion: PROMPT_VERSION,
    tokenCost: usage,
  };
}

/** Deterministic, server-computed warnings — never model-sourced. */
export function computeWarnings(customer: Customer | null, lines: AnalysisLine[]): Warning[] {
  const warnings: Warning[] = [];

  if (customer?.overLimit) {
    warnings.push({
      type: "danger",
      title: "Risk limiti aşıldı",
      detail: `Cari bakiye risk limitini aşmış durumda. Yeni vadeli sipariş için finans onayı gerekir; peşin ya da kısmi tahsilat önerilir.`,
    });
  }

  const short = lines.filter((l) => l.note);
  if (short.length > 0) {
    warnings.push({
      type: "warn",
      title: `Stok yetersiz — ${short.length} kalem`,
      detail: short.map((l) => `${l.name}: ${l.note}`).join(" "),
    });
  }

  const ambiguous = lines.filter((l) => l.ambiguous);
  if (ambiguous.length > 0) {
    warnings.push({
      type: "warn",
      title: `Netleştirilmesi gereken ${ambiguous.length} kalem`,
      detail: `Bu satırlar düşük güvenle eşleşti veya adet/özellik belirsiz — teklif öncesi temsilci onayı gerekir.`,
    });
  }

  return warnings;
}
