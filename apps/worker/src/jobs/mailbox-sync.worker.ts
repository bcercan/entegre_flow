import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Worker, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { and, eq } from "drizzle-orm";
import { schema, TenantAwareDb } from "@entegreflow/db";
import {
  EnvelopeCrypto,
  EnvKeyProvider,
  credentialAad,
  type TenantContext,
} from "@entegreflow/core";
import { ImapFetcher, type MailCursor, type RawInboundMessage } from "@entegreflow/mail";
import { QUEUE, createJobsClient, mailboxSyncJobSchema, type JobsClient } from "@entegreflow/jobs";
import { APP_CONFIG, TENANT_DB, type AppConfig } from "@entegreflow/server";

const EMPTY_CURSOR: MailCursor = { folder: "INBOX", uidValidity: null, lastUid: 0 };

/**
 * BullMQ consumer for `mailbox.sync`. Loads the account + its envelope-encrypted
 * IMAP credential, fetches new mail via IMAP, dedupes/threads each message,
 * links the sender to a customer, and enqueues `message.analyze`. Advances the
 * account's UID cursor so each run only pulls what's new.
 */
@Injectable()
export class MailboxSyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("MailboxSyncWorker");
  private worker?: Worker;
  private connection?: Redis;
  private jobs?: JobsClient;
  private crypto?: EnvelopeCrypto;

  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  onModuleInit(): void {
    if (!this.cfg.APP_ENCRYPTION_KEY) {
      this.logger.warn("APP_ENCRYPTION_KEY yok — mailbox.sync devre dışı.");
      return;
    }
    this.crypto = new EnvelopeCrypto(
      new EnvKeyProvider(this.cfg.APP_ENCRYPTION_KEY, this.cfg.APP_ENCRYPTION_KEY_ID),
    );
    this.jobs = createJobsClient(this.cfg.REDIS_URL);
    this.connection = new Redis(this.cfg.REDIS_URL, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      QUEUE.MAILBOX_SYNC,
      async (job) => {
        const { tenantId, accountId } = mailboxSyncJobSchema.parse(job.data);
        const ctx: TenantContext = { tenantId, userId: null, role: null, requestId: String(job.id) };
        return this.sync(ctx, accountId);
      },
      { connection: this.connection as unknown as ConnectionOptions, concurrency: 2 },
    );

    this.worker.on("failed", (job, err) =>
      this.logger.error(`mailbox.sync failed for ${job?.data?.accountId}: ${err.message}`),
    );
    this.logger.log(`MailboxSyncWorker listening on '${QUEUE.MAILBOX_SYNC}'`);
  }

  private async sync(ctx: TenantContext, accountId: string): Promise<{ ingested: number }> {
    // 1) Load the account + its encrypted IMAP credential.
    const loaded = await this.tdb.withTenant(ctx, async (tx) => {
      const [account] = await tx
        .select()
        .from(schema.emailAccounts)
        .where(eq(schema.emailAccounts.id, accountId))
        .limit(1);
      if (!account?.credentialId) return null;
      const [cred] = await tx
        .select()
        .from(schema.integrationCredentials)
        .where(eq(schema.integrationCredentials.id, account.credentialId))
        .limit(1);
      return cred ? { account, cred } : null;
    });
    if (!loaded) {
      this.logger.warn(`account ${accountId} bulunamadı veya kimlik bilgisi yok`);
      return { ingested: 0 };
    }

    const { account, cred } = loaded;
    const cfg = account.inboundConfig as { host: string; port: number; secure?: boolean; user: string };
    const password = this.crypto!.decrypt(
      {
        ciphertext: cred.ciphertext,
        iv: cred.iv,
        authTag: cred.authTag,
        dekWrapped: cred.dekWrapped,
        kekId: cred.kekId,
      },
      credentialAad(ctx.tenantId, cred.integrationId),
    );

    // 2) Fetch new mail via IMAP.
    const fetcher = new ImapFetcher({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure ?? false,
      user: cfg.user,
      pass: password,
    });
    const cursor = (account.syncCursor as MailCursor | null) ?? EMPTY_CURSOR;
    const { messages, nextCursor } = await fetcher.fetchSince(cursor);

    // 3) Ingest each new message (dedupe/thread/customer-link) + enqueue analysis.
    const newMessageIds: string[] = [];
    for (const raw of messages) {
      const id = await this.ingestOne(ctx, account.id, raw);
      if (id) newMessageIds.push(id);
    }

    // 4) Advance the cursor.
    await this.tdb.withTenant(ctx, (tx) =>
      tx
        .update(schema.emailAccounts)
        .set({ syncCursor: nextCursor as unknown as Record<string, unknown>, lastSyncAt: new Date() })
        .where(eq(schema.emailAccounts.id, account.id)),
    );

    for (const messageId of newMessageIds) {
      await this.jobs!.enqueueAnalyze({ tenantId: ctx.tenantId, messageId });
    }
    this.logger.log(`mailbox.sync ${account.id}: ${newMessageIds.length} yeni ileti alındı`);
    return { ingested: newMessageIds.length };
  }

  private async ingestOne(
    ctx: TenantContext,
    accountId: string,
    raw: RawInboundMessage,
  ): Promise<string | null> {
    return this.tdb.withTenant(ctx, async (tx) => {
      // dedupe on (account, RFC822 message-id)
      const dup = await tx
        .select({ id: schema.emailMessages.id })
        .from(schema.emailMessages)
        .where(
          and(
            eq(schema.emailMessages.accountId, accountId),
            eq(schema.emailMessages.messageId, raw.messageId),
          ),
        )
        .limit(1);
      if (dup.length) return null;

      // sender → customer (persisted mapping; DKIM-gating is a later hardening)
      const [map] = await tx
        .select()
        .from(schema.contactCustomerMap)
        .where(eq(schema.contactCustomerMap.contactEmail, raw.from.address))
        .limit(1);
      const customerId = map?.customerId ?? null;

      // thread: attach to the replied-to thread if known, else start a new one
      let threadId: string | undefined;
      if (raw.inReplyTo) {
        const [t] = await tx
          .select({ threadId: schema.emailMessages.threadId })
          .from(schema.emailMessages)
          .where(eq(schema.emailMessages.messageId, raw.inReplyTo))
          .limit(1);
        threadId = t?.threadId;
      }
      if (!threadId) {
        const [nt] = await tx
          .insert(schema.emailThreads)
          .values({
            tenantId: ctx.tenantId,
            accountId,
            subject: raw.subject,
            customerId,
            status: "inbox",
          })
          .returning();
        threadId = nt!.id;
      }

      const [msg] = await tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId,
          accountId,
          direction: "inbound",
          messageId: raw.messageId,
          inReplyTo: raw.inReplyTo,
          references: raw.references,
          from: { name: raw.from.name ?? null, address: raw.from.address },
          to: raw.to.map((a) => ({ name: a.name ?? null, address: a.address })),
          subject: raw.subject,
          snippet: raw.text.slice(0, 140),
          bodyText: raw.text,
          bodyHtml: raw.html,
          receivedAt: raw.receivedAt,
          isRead: false,
          aiStatus: "pending",
        })
        .onConflictDoNothing()
        .returning();
      return msg?.id ?? null;
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.jobs?.close();
    await this.connection?.quit();
  }
}
