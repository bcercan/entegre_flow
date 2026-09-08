import { Queue, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE, analyzeJobSchema, mailboxSyncJobSchema, type AnalyzeJob, type MailboxSyncJob } from "./queues";

export interface JobsClient {
  enqueueAnalyze(job: AnalyzeJob): Promise<void>;
  enqueueMailboxSync(job: MailboxSyncJob): Promise<void>;
  /** Register a recurring mailbox.sync for an account (idempotent upsert). */
  scheduleMailboxSync(job: MailboxSyncJob, everyMs: number): Promise<void>;
  removeMailboxSchedule(accountId: string): Promise<void>;
  close(): Promise<void>;
}

/** Producer-side client (used by the api / scripts to enqueue work). */
export function createJobsClient(redisUrl: string): JobsClient {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  // bullmq bundles its own ioredis types; bridge the compile-time identity gap
  // (runtime accepts any ioredis instance).
  const conn = connection as unknown as ConnectionOptions;
  const analyze = new Queue(QUEUE.ANALYZE, { connection: conn });
  const mailboxSync = new Queue(QUEUE.MAILBOX_SYNC, { connection: conn });

  const retryOpts = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 1000,
  };

  return {
    async enqueueAnalyze(job) {
      const data = analyzeJobSchema.parse(job);
      // jobId = message id → dedup: the same message is never queued twice.
      // (BullMQ forbids ":" in custom job ids.)
      await analyze.add("analyze", data, { ...retryOpts, jobId: `analyze-${data.messageId}` });
    },
    async enqueueMailboxSync(job) {
      const data = mailboxSyncJobSchema.parse(job);
      // No fixed jobId: sync is a recurring poll, so each run is a fresh job.
      // Correctness under overlap comes from the UID cursor + per-message dedup,
      // not from queue-level dedup (which would block re-syncing).
      await mailboxSync.add("sync", data, retryOpts);
    },
    async scheduleMailboxSync(job, everyMs) {
      const data = mailboxSyncJobSchema.parse(job);
      await mailboxSync.upsertJobScheduler(
        `sync-${data.accountId}`,
        { every: everyMs },
        { name: "sync", data, opts: retryOpts },
      );
    },
    async removeMailboxSchedule(accountId) {
      await mailboxSync.removeJobScheduler(`sync-${accountId}`);
    },
    async close() {
      await analyze.close();
      await mailboxSync.close();
      await connection.quit();
    },
  };
}
