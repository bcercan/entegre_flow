import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { DbClients } from "@entegreflow/db";
import type { Redis } from "ioredis";
import { DB_CLIENTS, REDIS } from "@entegreflow/server";

/**
 * Liveness vs readiness:
 *  - /healthz   never touches dependencies (process is alive)
 *  - /readyz    checks DB + Redis only (NEVER tenant integrations) — gates deploy
 */
@Controller()
export class HealthController {
  constructor(
    @Inject(DB_CLIENTS) private readonly db: DbClients,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get("healthz")
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readyz")
  async readiness(): Promise<{ status: "ready"; checks: Record<string, string> }> {
    const checks: Record<string, "ok" | "fail"> = { db: "fail", redis: "fail" };

    try {
      await this.db.system.execute(sql`select 1`);
      checks.db = "ok";
    } catch {
      checks.db = "fail";
    }

    try {
      checks.redis = (await this.redis.ping()) === "PONG" ? "ok" : "fail";
    } catch {
      checks.redis = "fail";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");
    if (!healthy) {
      throw new ServiceUnavailableException({ status: "unavailable", checks });
    }
    return { status: "ready", checks };
  }
}
