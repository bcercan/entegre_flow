import { Module } from "@nestjs/common";
import { AiCostGuard, InMemoryCostGuardStore, createLlmProvider } from "@entegreflow/ai";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { AuthModule } from "../auth/auth.module";
import { AnalysisService } from "./analysis.service";
import { MessagesController } from "./messages.controller";
import { AI_COST_GUARD, LLM_PROVIDER } from "./ai.tokens";

@Module({
  imports: [AuthModule],
  controllers: [MessagesController],
  providers: [
    AnalysisService,
    {
      // Real Claude when a key is present; deterministic mock otherwise (dev/CI).
      provide: LLM_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) =>
        createLlmProvider({
          apiKey: cfg.ANTHROPIC_API_KEY,
          model: cfg.ANTHROPIC_MODEL,
          maxTokens: cfg.AI_MAX_OUTPUT_TOKENS,
        }),
    },
    {
      provide: AI_COST_GUARD,
      inject: [APP_CONFIG],
      // Phase 1 dev: in-memory per-process budget. Phase 2: Redis-backed store.
      useFactory: (cfg: AppConfig) =>
        new AiCostGuard(new InMemoryCostGuardStore(), cfg.AI_DAILY_TOKEN_BUDGET),
    },
  ],
})
export class AnalysisModule {}
