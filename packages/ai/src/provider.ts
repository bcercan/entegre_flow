import type { AiAnalysis } from "@entegreflow/contracts";

/** A server-retrieved candidate the model MUST pick SKUs from (injection defense). */
export interface RfqCandidate {
  sku: string;
  name: string;
  unit: string;
  aliases: string[];
}

export interface RfqCustomerContext {
  name: string;
  segment: string | null;
  paymentTerm: string | null;
  overLimit: boolean;
}

export interface AnalyzeRfqInput {
  subject: string;
  body: string;
  /** The ONLY SKUs the model may return in `matchedSku`. */
  candidates: RfqCandidate[];
  customer: RfqCustomerContext | null;
  companyName?: string;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Swappable LLM port. `MockLlmProvider` is deterministic (offline/dev/tests);
 * `AnthropicProvider` calls Claude with forced tool-use structured output.
 * Both return the SAME validated `AiAnalysis` shape.
 */
export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  analyzeRfq(input: AnalyzeRfqInput): Promise<{ analysis: AiAnalysis; usage: LlmUsage }>;
}
