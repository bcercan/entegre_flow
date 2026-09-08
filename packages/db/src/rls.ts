/**
 * Row-Level Security policy generation.
 *
 * `TENANT_SCOPED_TABLES` is the single source of truth: a CI test
 * (rls.test via assertRlsCoverage) fails the build if any of these tables lacks
 * FORCE RLS + a tenant policy. Adding a tenant-scoped table without RLS is
 * therefore a build error, not a silent leak.
 *
 * Policies are created `TO public` and apply to every non-BYPASSRLS role. The
 * runtime app role is NOBYPASSRLS with a fail-closed sentinel default for
 * `app.tenant_id`; the owner/migration role is BYPASSRLS (seed/migrate/auth).
 */

/** Tables filtered by `tenant_id = current_setting('app.tenant_id')`. */
export const TENANT_SCOPED_TABLES = [
  "memberships",
  "invitations",
  "integrations",
  "integration_credentials",
  "customers",
  "catalog_items",
  "price_entries",
  "stock_snapshots",
  "email_accounts",
  "email_threads",
  "email_messages",
  "attachments",
  "contact_customer_map",
  "message_analyses",
  "quote_drafts",
  "quotes",
  "sent_replies",
  "audit_logs",
] as const;

/** Tenant-aware but keyed on `id` (the tenant row itself). */
const SELF_KEYED_TABLE = "tenants";

/** Tables that are deliberately NOT tenant-RLS (accessed via owner/auth path). */
export const NON_TENANT_TABLES = ["users", "refresh_tokens", "platform_audit_logs"] as const;

/** Append-only tables: runtime role gets SELECT + INSERT only. */
const APPEND_ONLY_TABLES = ["audit_logs"] as const;

/** Build the ordered SQL statements that enforce RLS + grants for the app role. */
export function buildRlsStatements(appRole: string): string[] {
  const stmts: string[] = [];

  // --- tenant-scoped tables: enable + force + isolation policy + grants -------
  for (const table of TENANT_SCOPED_TABLES) {
    stmts.push(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    stmts.push(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    stmts.push(`DROP POLICY IF EXISTS tenant_isolation ON "${table}";`);
    stmts.push(
      `CREATE POLICY tenant_isolation ON "${table}" ` +
        `USING (tenant_id = current_setting('app.tenant_id')::uuid) ` +
        `WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`,
    );

    if ((APPEND_ONLY_TABLES as readonly string[]).includes(table)) {
      stmts.push(`REVOKE UPDATE, DELETE, TRUNCATE ON "${table}" FROM "${appRole}";`);
      stmts.push(`GRANT SELECT, INSERT ON "${table}" TO "${appRole}";`);
    } else {
      stmts.push(`GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO "${appRole}";`);
    }
  }

  // --- the tenants table: keyed on id ----------------------------------------
  stmts.push(`ALTER TABLE "${SELF_KEYED_TABLE}" ENABLE ROW LEVEL SECURITY;`);
  stmts.push(`ALTER TABLE "${SELF_KEYED_TABLE}" FORCE ROW LEVEL SECURITY;`);
  stmts.push(`DROP POLICY IF EXISTS tenant_self ON "${SELF_KEYED_TABLE}";`);
  stmts.push(
    `CREATE POLICY tenant_self ON "${SELF_KEYED_TABLE}" ` +
      `USING (id = current_setting('app.tenant_id')::uuid) ` +
      `WITH CHECK (id = current_setting('app.tenant_id')::uuid);`,
  );
  stmts.push(`GRANT SELECT, UPDATE ON "${SELF_KEYED_TABLE}" TO "${appRole}";`);

  // --- platform audit: app may append, never read others ---------------------
  stmts.push(`GRANT INSERT ON "platform_audit_logs" TO "${appRole}";`);

  return stmts;
}
