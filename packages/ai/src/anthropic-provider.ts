import Anthropic from "@anthropic-ai/sdk";
import type { AiAnalysis } from "@entegreflow/contracts";
import { aiAnalysisSchema } from "@entegreflow/contracts";
import type { AnalyzeRfqInput, LlmProvider, LlmUsage } from "./provider";
import { ANALYSIS_TOOL_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  maxTokens?: number;
  maxRetries?: number;
}

/**
 * Real Claude provider. Forces structured output via a single tool, validates
 * against aiAnalysisSchema, and retries with a correction on schema mismatch.
 * On repeated failure it throws — the caller marks the analysis failed and
 * falls back to manual handling (never guesses).
 */
export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly model: string;
  private readonly client: Anthropic;
  private readonly maxTokens: number;
  private readonly maxRetries: number;

  constructor(opts: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.maxTokens = opts.maxTokens ?? 2048;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  async analyzeRfq(input: AnalyzeRfqInput): Promise<{ analysis: AiAnalysis; usage: LlmUsage }> {
    const userPrompt = buildUserPrompt(input);
    let lastError: unknown;
    let usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: "submit_analysis",
            description: "RFQ analiz sonucunu yapılandırılmış olarak gönder.",
            input_schema: ANALYSIS_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "submit_analysis" },
        messages: [
          {
            role: "user",
            content:
              attempt === 0
                ? userPrompt
                : `${userPrompt}\n\nÖnceki çıktı şemaya uymadı: ${String(lastError)}. Lütfen submit_analysis aracını şemaya birebir uyarak tekrar çağır.`,
          },
        ],
      });

      usage = {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      };

      const toolUse = res.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (!toolUse) {
        lastError = new Error("Model tool_use bloğu döndürmedi");
        continue;
      }

      const parsed = aiAnalysisSchema.safeParse(toolUse.input);
      if (parsed.success) {
        // Hard filter: drop any SKU the model invented outside the candidate set.
        const allowed = new Set(input.candidates.map((c) => c.sku));
        const analysis: AiAnalysis = {
          ...parsed.data,
          lineItems: parsed.data.lineItems.map((li) =>
            li.matchedSku && allowed.has(li.matchedSku)
              ? li
              : { ...li, matchedSku: null, ambiguous: true },
          ),
        };
        return { analysis, usage };
      }
      lastError = parsed.error.message;
    }

    throw new Error(`AI analizi şema doğrulamasından geçemedi: ${String(lastError)}`);
  }
}
