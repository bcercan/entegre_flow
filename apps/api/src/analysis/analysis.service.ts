import { Inject, Injectable } from "@nestjs/common";
import { TenantAwareDb } from "@entegreflow/db";
import type { TenantContext } from "@entegreflow/core";
import type { AiCostGuard, LlmProvider } from "@entegreflow/ai";
import type { Customer, MessageAnalysis } from "@entegreflow/contracts";
import { analyzeAndPersist } from "@entegreflow/analysis";
import { TENANT_DB } from "@entegreflow/server";
import { AI_COST_GUARD, LLM_PROVIDER } from "./ai.tokens";

/** Thin Nest wrapper over the shared `analyzeAndPersist` (reused by the worker). */
@Injectable()
export class AnalysisService {
  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(AI_COST_GUARD) private readonly costGuard: AiCostGuard,
  ) {}

  analyze(
    messageId: string,
    ctx: TenantContext,
  ): Promise<MessageAnalysis & { customer: Customer | null }> {
    return analyzeAndPersist(messageId, ctx, {
      tdb: this.tdb,
      llm: this.llm,
      costGuard: this.costGuard,
    });
  }
}
