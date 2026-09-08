import { z } from "zod";

/** Queue names. Keep in sync between producers (api) and consumers (worker). */
export const QUEUE = {
  ANALYZE: "message.analyze",
  MAILBOX_SYNC: "mailbox.sync",
} as const;

/** Every job carries the tenant so the worker can re-establish RLS context. */
export const analyzeJobSchema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().uuid(),
});
export type AnalyzeJob = z.infer<typeof analyzeJobSchema>;

export const mailboxSyncJobSchema = z.object({
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
});
export type MailboxSyncJob = z.infer<typeof mailboxSyncJobSchema>;
