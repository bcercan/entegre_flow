import type { AiAnalysis, AiLineItem } from "@entegreflow/contracts";
import { aiAnalysisSchema } from "@entegreflow/contracts";
import type { AnalyzeRfqInput, LlmProvider } from "./provider";
import { extractQuantity, matchLine, normalizeTr, splitRequestLines } from "./matcher";

/**
 * Deterministic, offline LLM stand-in. Produces the same `AiAnalysis` shape the
 * real model returns, so the whole analysis pipeline is testable without a key
 * and dev works without spending tokens.
 */
export class MockLlmProvider implements LlmProvider {
  readonly id = "mock";
  readonly model = "mock-rules-v1";

  async analyzeRfq(input: AnalyzeRfqInput): Promise<{ analysis: AiAnalysis; usage: { inputTokens: number; outputTokens: number } }> {
    const { body, candidates } = input;
    const norm = normalizeTr(`${input.subject} ${body}`);

    const lines: AiLineItem[] = splitRequestLines(body, candidates).map((raw) => {
      const { qty, unit } = extractQuantity(raw);
      const match = matchLine(raw, candidates);
      const cand = match ? candidates.find((c) => c.sku === match.sku) : undefined;
      const confidence = match?.confidence ?? 0;
      return {
        requestText: raw,
        qty,
        unit: unit ?? cand?.unit ?? null,
        matchedSku: match?.sku ?? null,
        matchConfidence: confidence,
        ambiguous: !match || qty === null || confidence < 0.6,
      };
    });

    const billable = lines.filter((l) => l.matchedSku && (l.qty ?? 0) > 0);

    const intents = ["Teklif talebi"];
    if (/\bacil\b/.test(norm)) intents.push("Acil teslimat");
    if (/(vade|gun vade|\d+ gun)/.test(norm)) intents.push("Vadeli satış");
    if (/\bstok\b/.test(norm)) intents.push("Stok sorgusu");
    if (/(ce|belge|sertifika|en \d)/.test(norm)) intents.push("CE belgeli ürün şartı");

    const summary =
      billable.length > 0
        ? `Müşteri ${billable.length} kalem ürün için teklif istiyor. Talep ayrıştırıldı ve kalemler kataloğa eşlendi.`
        : `Bu ileti somut bir sipariş kalemi içermiyor; bilgi/fiyat listesi talebi olabilir.`;

    const draftBody = this.buildDraft(input);

    const analysis = aiAnalysisSchema.parse({
      summary,
      intents,
      draftBody,
      lineItems: lines,
      warnings: [], // deterministic risk/stock warnings are computed server-side
    });

    // Rough token accounting so AiCostGuard has something to record in dev.
    const inputTokens = Math.ceil((input.subject.length + body.length) / 4);
    const outputTokens = Math.ceil(JSON.stringify(analysis).length / 4);
    return { analysis, usage: { inputTokens, outputTokens } };
  }

  private buildDraft(input: AnalyzeRfqInput): string {
    const company = input.companyName ?? input.customer?.name ?? "firmanız";
    const term = input.customer?.paymentTerm ?? "—";
    return (
      `Sayın Yetkili,\n\n` +
      `Talebiniz için teşekkür ederiz. ${company} adına hazırladığımız fiyat teklifimiz aşağıdadır. ` +
      `Tüm ürünlerimiz CE belgeli olup fiyatlara KDV dahil değildir.\n\n` +
      `[TEKLİF TABLOSU]\n\n` +
      `Ödeme: ${term} · Teslim: stoktaki kalemler 1–2 iş günü içinde sevk edilir.\n` +
      `Teklifimiz 7 gün geçerlidir.\n\n` +
      `Saygılarımızla,\nEntegre Safety · Satış Ekibi`
    );
  }
}
