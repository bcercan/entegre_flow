import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import type { TenantContext } from "@entegreflow/core";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface DbClients {
  /** App role: NOBYPASSRLS, RLS-enforced. Used for ALL tenant data access. */
  runtime: Db;
  /** Owner role: BYPASSRLS. Auth (login-by-email), platform ops, migrate/seed only. */
  system: Db;
  close: () => Promise<void>;
}

export interface DbClientOptions {
  /** Runtime (app role) connection string. */
  url: string;
  /** Owner/system connection string. Defaults to `url` (dev). */
  systemUrl?: string;
  max?: number;
}

export function createDbClients(opts: DbClientOptions): DbClients {
  // prepare:false keeps us compatible with transaction-mode pooling (PgBouncer).
  const runtimeSql = postgres(opts.url, { max: opts.max ?? 10, prepare: false });
  const systemSql = opts.systemUrl
    ? postgres(opts.systemUrl, { max: 4, prepare: false })
    : runtimeSql;

  return {
    runtime: drizzle(runtimeSql, { schema }),
    system: drizzle(systemSql, { schema }),
    close: async () => {
      await runtimeSql.end({ timeout: 5 });
      if (opts.systemUrl) await systemSql.end({ timeout: 5 });
    },
  };
}

/**
 * The ONLY sanctioned path to tenant data. Opens a transaction, sets the RLS
 * session variables LOCAL to it, then runs the callback. ESLint forbids using
 * the raw runtime client outside this wrapper.
 */
export class TenantAwareDb {
  constructor(private readonly db: Db) {}

  async withTenant<T>(ctx: TenantContext, fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      // set_config(..., true) = LOCAL to this transaction. Parameterized → no injection.
      await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
      await tx.execute(sql`select set_config('app.user_id', ${ctx.userId ?? ""}, true)`);
      return fn(tx);
    });
  }
}
