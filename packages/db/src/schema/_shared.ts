import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Primary key column. */
export const pk = () => uuid("id").primaryKey().defaultRandom();

/** created_at / updated_at columns. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * tenant_id column for tenant-scoped tables. RLS policies reference this.
 * NOTE: every table that includes this MUST be listed in TENANT_SCOPED_TABLES
 * (rls.ts) — a CI test fails the build if any is missing its FORCE RLS policy.
 */
export const tenantId = () => uuid("tenant_id").notNull();

export { sql };
