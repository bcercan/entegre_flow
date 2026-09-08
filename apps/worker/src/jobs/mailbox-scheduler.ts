import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { schema, type DbClients } from "@entegreflow/db";
import { createJobsClient, type JobsClient } from "@entegreflow/jobs";
import { APP_CONFIG, DB_CLIENTS, type AppConfig } from "@entegreflow/server";

/**
 * Registers a recurring `mailbox.sync` per active mailbox so mail is polled
 * automatically (no manual trigger). Uses BullMQ job schedulers keyed by
 * account id — idempotent, so running multiple workers produces one schedule
 * per account (no duplicate polling). Enumerating accounts is a cross-tenant
 * infra query, so it uses the system (BYPASSRLS) connection.
 */
@Injectable()
export class MailboxScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("MailboxScheduler");
  private jobs?: JobsClient;

  constructor(
    @Inject(DB_CLIENTS) private readonly db: DbClients,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.jobs = createJobsClient(this.cfg.REDIS_URL);
    const accounts = await this.db.system
      .select({ id: schema.emailAccounts.id, tenantId: schema.emailAccounts.tenantId })
      .from(schema.emailAccounts)
      .where(eq(schema.emailAccounts.status, "active"));

    for (const a of accounts) {
      await this.jobs.scheduleMailboxSync(
        { tenantId: a.tenantId, accountId: a.id },
        this.cfg.MAILBOX_SYNC_INTERVAL_MS,
      );
    }
    this.logger.log(
      `scheduled mailbox.sync for ${accounts.length} account(s) every ${this.cfg.MAILBOX_SYNC_INTERVAL_MS}ms`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.jobs?.close();
  }
}
