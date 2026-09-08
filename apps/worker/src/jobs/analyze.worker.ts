import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Worker, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { TenantAwareDb } from "@entegreflow/db";
import {
  AiCostGuard,
  InMemoryCostGuardStore,
  createLlmProvider,
  type LlmProvider,
} from "@entegreflow/ai";
import { analyzeAndPersist } from "@entegreflow/analysis";
import { QUEUE, analyzeJobSchema } from "@entegreflow/jobs";
import { APP_CONFIG, TENANT_DB, type AppConfig } from "@entegreflow/server";

/**
 * BullMQ consumer for `message.analyze`. Re-establishes the tenant context from
 * the job payload (RLS), then runs the SAME `analyzeAndPersist` the api uses.
 * Retries/backoff/dedup are configured by the producer (jobs client).
 */
@Injectable()
export class AnalyzeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("AnalyzeWorker");
  private worker?: Worker;
  private connection?: Redis;
  private llm!: LlmProvider;
  private costGuard!: AiCostGuard;

  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  onModuleInit(): void {
    this.llm = createLlmProvider({
      apiKey: this.cfg.ANTHROPIC_API_KEY,
      model: this.cfg.ANTHROPIC_MODEL,
      maxTokens: this.cfg.AI_MAX_OUTPUT_TOKENS,
    });
    this.costGuard = new AiCostGuard(new InMemoryCostGuardStore(), this.cfg.AI_DAILY_TOKEN_BUDGET);
    this.connection = new Redis(this.cfg.REDIS_URL, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      QUEUE.ANALYZE,
      async (job) => {
        const { tenantId, messageId } = analyzeJobSchema.parse(job.data);
        const ctx = { tenantId, userId: null, role: null, requestId: String(job.id ?? "job") };
        await analyzeAndPersist(messageId, ctx, {
          tdb: this.tdb,
          llm: this.llm,
          costGuard: this.costGuard,
        });
        return { messageId };
      },
      { connection: this.connection as unknown as ConnectionOptions, concurrency: 4 },
    );

    this.worker.on("completed", (job) =>
      this.logger.log(`analyzed message ${(job.data as { messageId?: string })?.messageId}`),
    );
    this.worker.on("failed", (job, err) =>
      this.logger.error(
        `analyze failed for ${(job?.data as { messageId?: string })?.messageId}: ${err.message}`,
      ),
    );
    this.logger.log(`AnalyzeWorker listening on '${QUEUE.ANALYZE}'`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
  }
}
