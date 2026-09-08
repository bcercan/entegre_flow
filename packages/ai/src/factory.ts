import type { LlmProvider } from "./provider";
import { MockLlmProvider } from "./mock-provider";
import { AnthropicProvider } from "./anthropic-provider";

/**
 * Pick the LLM provider from config: real Claude when an API key is present,
 * deterministic mock otherwise (dev/CI). Shared by the api + worker so both
 * paths behave identically.
 */
export function createLlmProvider(opts: {
  apiKey?: string;
  model: string;
  maxTokens?: number;
}): LlmProvider {
  return opts.apiKey
    ? new AnthropicProvider({ apiKey: opts.apiKey, model: opts.model, maxTokens: opts.maxTokens })
    : new MockLlmProvider();
}
