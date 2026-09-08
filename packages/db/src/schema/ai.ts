import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AnalysisLine,
  OrderHistoryEntry,
  QuoteLine,
  Warning,
} from "@entegreflow/contracts";
import { pk, timestamps, tenantId, sql } from "./_shared";

export const analysisStatusEnum = pgEnum("analysis_status", ["ready", "failed"]);
export const quoteDraftStatusEnum = pgEnum("quote_draft_status", [
  "draft",
  "approved",
  "discarded",
]);
export const quoteStatusEnum = pgEnum("quote_status", ["queued", "sent", "failed"]);

/** Persisted enriched analysis (one per message). Tenant-scoped. */
export const messageAnalyses = pgTable(
  "message_analyses",
  {
    id: pk(),
    tenantId: tenantId(),
    messageId: uuid("message_id").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    summary: text("summary").notNull(),
    intents: jsonb("intents").$type<string[]>().notNull().default([]),
    lines: jsonb("lines").$type<AnalysisLine[]>().notNull().default([]),
    warnings: jsonb("warnings").$type<Warning[]>().notNull().default([]),
    history: jsonb("history").$type<OrderHistoryEntry[]>().notNull().default([]),
    draftText: text("draft_text").notNull().default(""),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    status: analysisStatusEnum("status").notNull().default("ready"),
    ...timestamps,
  },
  (t) => [unique("message_analyses_message_uniq").on(t.messageId)],
);

/** Editable, versioned quote draft (pre-approval). Tenant-scoped. */
export const quoteDrafts = pgTable(
  "quote_drafts",
  {
    id: pk(),
    tenantId: tenantId(),
    messageId: uuid("message_id").notNull(),
    threadId: uuid("thread_id").notNull(),
    customerId: uuid("customer_id"),
    bodyText: text("body_text").notNull(),
    lines: jsonb("lines").$type<QuoteLine[]>().notNull().default([]),
    netMinor: bigint("net_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("TRY"),
    version: integer("version").notNull().default(1),
    status: quoteDraftStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (t) => [index("quote_drafts_thread_idx").on(t.threadId)],
);

/** Immutable quote snapshot (post-approval). Tenant-scoped. */
export const quotes = pgTable(
  "quotes",
  {
    id: pk(),
    tenantId: tenantId(),
    draftId: uuid("draft_id").notNull(),
    threadId: uuid("thread_id").notNull(),
    number: text("number").notNull(),
    customerId: uuid("customer_id"),
    lines: jsonb("lines").$type<QuoteLine[]>().notNull(),
    netMinor: bigint("net_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("TRY"),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    status: quoteStatusEnum("status").notNull().default("queued"),
    approvedBy: uuid("approved_by"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    ...timestamps,
  },
  (t) => [
    unique("quotes_tenant_number_uniq").on(t.tenantId, t.number),
    // At most one active (queued|sent) quote per thread — blocks double-quote.
    uniqueIndex("quotes_thread_active_uniq")
      .on(t.threadId)
      .where(sql`status in ('queued','sent')`),
  ],
);

/** Send record with idempotency key (= quoteId) to prevent double-send. */
export const sentReplies = pgTable(
  "sent_replies",
  {
    id: pk(),
    tenantId: tenantId(),
    quoteId: uuid("quote_id").notNull(),
    messageId: uuid("message_id"),
    status: quoteStatusEnum("status").notNull().default("queued"),
    idempotencyKey: text("idempotency_key").notNull(),
    providerMessageId: text("provider_message_id"),
    ...timestamps,
  },
  (t) => [unique("sent_replies_idempotency_uniq").on(t.idempotencyKey)],
);
