import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { pk, timestamps, tenantId } from "./_shared";

export const emailDirectionEnum = pgEnum("email_direction", ["inbound", "outbound"]);
export const threadStatusEnum = pgEnum("thread_status", ["inbox", "answered", "other", "deleted", "draft"]);
export const aiStatusEnum = pgEnum("ai_status", [
  "none",
  "pending",
  "analyzing",
  "ready",
  "risk",
  "info",
  "answered",
  "failed",
]);

type EmailAddress = { name: string | null; address: string };

/** A connected mailbox (IMAP in / SMTP out). Tenant-scoped. */
export const emailAccounts = pgTable(
  "email_accounts",
  {
    id: pk(),
    tenantId: tenantId(),
    provider: text("provider").notNull().default("imap-smtp"),
    address: text("address").notNull(),
    inboundConfig: jsonb("inbound_config").$type<Record<string, unknown>>().notNull().default({}),
    smtpConfig: jsonb("smtp_config").$type<Record<string, unknown>>().notNull().default({}),
    credentialId: uuid("credential_id"),
    status: text("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    /** IMAP cursor { folder, uidValidity, lastUid }. */
    syncCursor: jsonb("sync_cursor").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("email_accounts_tenant_idx").on(t.tenantId)],
);

/** A conversation thread. Tenant-scoped. */
export const emailThreads = pgTable(
  "email_threads",
  {
    id: pk(),
    tenantId: tenantId(),
    accountId: uuid("account_id").notNull(),
    subject: text("subject").notNull(),
    customerId: uuid("customer_id"),
    status: threadStatusEnum("status").notNull().default("inbox"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    messageCount: integer("message_count").notNull().default(1),
    ...timestamps,
  },
  (t) => [index("email_threads_tenant_status_idx").on(t.tenantId, t.status, t.lastMessageAt)],
);

/** A single message. Dedupe on (account_id, message_id). Tenant-scoped. */
export const emailMessages = pgTable(
  "email_messages",
  {
    id: pk(),
    tenantId: tenantId(),
    threadId: uuid("thread_id").notNull(),
    accountId: uuid("account_id").notNull(),
    direction: emailDirectionEnum("direction").notNull(),
    messageId: text("message_id").notNull(),
    inReplyTo: text("in_reply_to"),
    references: text("references").array(),
    from: jsonb("from").$type<EmailAddress>().notNull(),
    to: jsonb("to").$type<EmailAddress[]>().notNull().default([]),
    subject: text("subject").notNull(),
    snippet: text("snippet").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    bodyHtml: text("body_html"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    isFlagged: boolean("is_flagged").notNull().default(false),
    aiStatus: aiStatusEnum("ai_status").notNull().default("none"),
    ...timestamps,
  },
  (t) => [
    unique("email_messages_account_message_uniq").on(t.accountId, t.messageId),
    index("email_messages_thread_idx").on(t.threadId, t.receivedAt),
  ],
);

/** Attachment metadata; bytes live in object storage under storage_key. */
export const attachments = pgTable(
  "attachments",
  {
    id: pk(),
    tenantId: tenantId(),
    messageId: uuid("message_id").notNull(),
    filenameDisplay: text("filename_display").notNull(),
    storageKey: text("storage_key").notNull(), // server-generated, never raw filename
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    scanned: boolean("scanned").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("attachments_message_idx").on(t.messageId)],
);

/** Persisted sender→customer mapping (manual or DKIM-verified). Tenant-scoped. */
export const contactCustomerMap = pgTable(
  "contact_customer_map",
  {
    id: pk(),
    tenantId: tenantId(),
    contactEmail: text("contact_email").notNull(),
    customerId: uuid("customer_id").notNull(),
    verified: boolean("verified").notNull().default(false),
    ...timestamps,
  },
  (t) => [unique("contact_customer_map_tenant_email_uniq").on(t.tenantId, t.contactEmail)],
);
