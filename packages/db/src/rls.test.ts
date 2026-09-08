/**
 * Cross-tenant isolation probe + RLS coverage — the load-bearing CI gate.
 *
 * Requires a migrated Postgres:
 *   TEST_DATABASE_URL           → app role (NOBYPASSRLS) connection
 *   TEST_DATABASE_MIGRATION_URL → owner role (BYPASSRLS) connection
 * If unset, the suite is skipped (so `pnpm test` is green without a DB locally).
 */
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClients, TenantAwareDb } from "./client";
import { TENANT_SCOPED_TABLES } from "./rls";
import * as schema from "./schema";
import type { TenantContext } from "@entegreflow/core";

const appUrl = process.env.TEST_DATABASE_URL;
const ownerUrl = process.env.TEST_DATABASE_MIGRATION_URL ?? appUrl;

const TENANT_A = "00000000-0000-0000-0000-00000000aa01";
const TENANT_B = "00000000-0000-0000-0000-00000000bb01";

const ctx = (tenantId: string): TenantContext => ({
  tenantId,
  userId: null,
  role: null,
  requestId: "test",
});

describe.skipIf(!appUrl)("RLS tenant isolation", () => {
  const clients = createDbClients({ url: appUrl!, systemUrl: ownerUrl });
  const tdb = new TenantAwareDb(clients.runtime);

  afterAll(async () => {
    // best-effort cleanup
    await clients.system
      .delete(schema.customers)
      .where(sql`tenant_id in (${TENANT_A}::uuid, ${TENANT_B}::uuid)`)
      .catch(() => undefined);
    await clients.system
      .delete(schema.tenants)
      .where(sql`id in (${TENANT_A}::uuid, ${TENANT_B}::uuid)`)
      .catch(() => undefined);
    await clients.close();
  });

  it("seeds two tenants via the owner (BYPASSRLS) connection", async () => {
    for (const [id, name, code] of [
      [TENANT_A, "Tenant A", "A-001"],
      [TENANT_B, "Tenant B", "B-001"],
    ] as const) {
      await clients.system
        .insert(schema.tenants)
        .values({ id, name, slug: `probe-${id.slice(-6)}` })
        .onConflictDoNothing();
      await clients.system
        .insert(schema.customers)
        .values({ tenantId: id, erpCode: code, name: `${name} cari` })
        .onConflictDoNothing();
    }
    expect(true).toBe(true);
  });

  it("tenant A sees only A's rows, zero of B's", async () => {
    const rows = await tdb.withTenant(ctx(TENANT_A), (tx) => tx.select().from(schema.customers));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === TENANT_A)).toBe(true);
    expect(rows.some((r) => r.tenantId === TENANT_B)).toBe(false);
  });

  it("tenant B sees only B's rows", async () => {
    const rows = await tdb.withTenant(ctx(TENANT_B), (tx) => tx.select().from(schema.customers));
    expect(rows.every((r) => r.tenantId === TENANT_B)).toBe(true);
  });

  it("fails closed: no tenant context → zero rows (sentinel default)", async () => {
    const rows = await clients.runtime.select().from(schema.customers);
    expect(rows.length).toBe(0);
  });

  it("WITH CHECK blocks writing another tenant's row", async () => {
    await expect(
      tdb.withTenant(ctx(TENANT_A), (tx) =>
        tx.insert(schema.customers).values({ tenantId: TENANT_B, erpCode: "X-1", name: "leak" }),
      ),
    ).rejects.toThrow();
  });
});

describe.skipIf(!ownerUrl)("RLS coverage", () => {
  const clients = createDbClients({ url: ownerUrl! });
  afterAll(() => clients.close());

  it("every tenant-scoped table has FORCE RLS + a policy", async () => {
    for (const table of TENANT_SCOPED_TABLES) {
      const meta = await clients.system.execute(
        sql`select relrowsecurity, relforcerowsecurity from pg_class where relname = ${table}`,
      );
      const row = (meta as unknown as Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>)[0];
      expect(row?.relrowsecurity, `${table} ENABLE RLS`).toBe(true);
      expect(row?.relforcerowsecurity, `${table} FORCE RLS`).toBe(true);

      const policies = await clients.system.execute(
        sql`select count(*)::int as n from pg_policies where tablename = ${table}`,
      );
      const n = (policies as unknown as Array<{ n: number }>)[0]?.n ?? 0;
      expect(n, `${table} has a policy`).toBeGreaterThan(0);
    }
  });
});
