import { index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { pk, timestamps, tenantId } from "./_shared";

export const roleEnum = pgEnum("role", ["owner", "admin", "agent", "viewer"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended"]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "invited", "disabled"]);

/** A tenant (organization). Not tenant-scoped itself; RLS matches on id. */
export const tenants = pgTable("tenants", {
  id: pk(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: tenantStatusEnum("status").notNull().default("active"),
  settings: jsonb("settings")
    .$type<{
      locale: string;
      currency: string;
      accent?: string;
      density?: "comfortable" | "compact";
      font?: string;
    }>()
    .notNull()
    .default({ locale: "tr", currency: "TRY" }),
  ...timestamps,
});

/** Global user identity (one human, may belong to many tenants). */
export const users = pgTable("users", {
  id: pk(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

/** Membership of a user in a tenant, with role. Tenant-scoped (RLS). */
export const memberships = pgTable(
  "memberships",
  {
    id: pk(),
    tenantId: tenantId(),
    userId: uuid("user_id").notNull(),
    role: roleEnum("role").notNull().default("agent"),
    status: membershipStatusEnum("status").notNull().default("active"),
    /** Refresh families issued before this instant are invalid (role change/kick). */
    tokenValidAfter: timestamp("token_valid_after", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique("memberships_tenant_user_uniq").on(t.tenantId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

/** Pending invitation to a tenant. Tenant-scoped (RLS) — closes invite IDOR. */
export const invitations = pgTable(
  "invitations",
  {
    id: pk(),
    tenantId: tenantId(),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("agent"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("invitations_tenant_idx").on(t.tenantId)],
);

/** Rotating refresh tokens (user-scoped). Accessed via the auth path. */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: pk(),
    userId: uuid("user_id").notNull(),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    device: text("device"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    ...timestamps,
  },
  (t) => [index("refresh_tokens_family_idx").on(t.familyId)],
);
