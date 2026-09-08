import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pk, tenantId } from "./_shared";

/**
 * Append-only audit log (tenant-scoped, RLS). DB grants withhold UPDATE/DELETE
 * from the runtime role, so entries are immutable.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: pk(),
    tenantId: tenantId(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(), // e.g. "credential.decrypt", "quote.sent", "authz.deny"
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    ip: text("ip"),
    requestId: text("request_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_tenant_idx").on(t.tenantId, t.createdAt)],
);

/**
 * Cross-tenant / superadmin events. NOT tenant-scoped (no RLS) — captures
 * events that have no single tenant, closing the null-tenant audit gap.
 */
export const platformAuditLogs = pgTable(
  "platform_audit_logs",
  {
    id: pk(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    ip: text("ip"),
    requestId: text("request_id"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("platform_audit_logs_created_idx").on(t.createdAt)],
);
