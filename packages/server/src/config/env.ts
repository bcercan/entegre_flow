import { z } from "zod";

/**
 * Boot-time env validation shared by api + worker. Hard-fails on bad config so
 * a misconfigured deploy never starts. Phase 0 keeps secret-dependent keys
 * optional; Phase 1 (crypto/auth) tightens them.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  API_PORT: z.coerce.number().int().positive().default(3001),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3002),

  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1),

  WEB_ORIGIN: z.string().default("http://localhost:3000"),

  // Secret encryption — required once integrations/credentials are wired (P1).
  APP_ENCRYPTION_KEY: z.string().optional(),
  APP_ENCRYPTION_KEY_ID: z.string().default("kek-1"),

  // Auth / JWT.
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(3600),
  JWT_ISSUER: z.string().default("entegreflow"),
  JWT_AUDIENCE: z.string().default("entegreflow-web"),

  // AI provider — Anthropic used when a key is present; deterministic mock otherwise.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2048),
  AI_DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().default(2_000_000),

  // Outbound SMTP. Dev target = Mailpit (localhost:1026). Prod: per-tenant mailbox (P1b).
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1026),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM: z.string().default("satis@entegresafety.com"),

  // How often the worker polls each active mailbox (repeatable mailbox.sync).
  MAILBOX_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),

  // Object storage (attachments / quote PDFs). Dev = MinIO (localhost:9000).
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("entegreflow"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof envSchema>;

/** DI token for the validated config. */
export const APP_CONFIG = Symbol("APP_CONFIG");

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function loadRootEnv(): void {
  if (typeof process.loadEnvFile !== "function") return;
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = join(curr, ".env");
    if (existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
      } catch {}
      return;
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (!env.DATABASE_URL) {
    loadRootEnv();
  }
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Geçersiz ortam değişkenleri:\n${issues}`);
  }
  return parsed.data;
}
