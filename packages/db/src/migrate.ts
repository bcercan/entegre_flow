/**
 * Migration runner — intended to run as a Coolify pre-deploy hook.
 *
 *   1. take a pg advisory lock (so concurrent replicas can't race)
 *   2. apply Drizzle schema migrations (forward-only)
 *   3. apply RLS (enable/force + policies + grants for the app role)
 *
 * Uses the OWNER connection (DATABASE_MIGRATION_URL). The app role is granted
 * least privilege by the RLS step.
 */
/* eslint-disable no-console -- CLI script: stdout logging is intentional. */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { buildRlsStatements } from "./rls";

const MIGRATION_LOCK_KEY = 947_201; // arbitrary, stable app-wide advisory lock id

async function main(): Promise<void> {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL (or DATABASE_URL) is required");
  const appRole = process.env.APP_DB_ROLE ?? "entegreflow_app";

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle");

  try {
    await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
    console.log("[migrate] advisory lock acquired");

    await migrate(db, { migrationsFolder });
    console.log("[migrate] schema migrations applied");

    const statements = buildRlsStatements(appRole);
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
    });
    console.log(`[migrate] RLS applied for role "${appRole}" (${statements.length} statements)`);
  } finally {
    await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`.catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  },
);
