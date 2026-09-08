import { pino, type Logger, type LoggerOptions } from "pino";

/**
 * Structured logger. Redacts secrets and bulk email bodies so they never reach
 * stdout/Sentry. Tenant/request/job ids are attached by the caller via child().
 */
const REDACT_PATHS = [
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.secret",
  "*.ciphertext",
  "*.dekWrapped",
  "*.authorization",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.bodyHtml",
  "*.bodyText",
  "*.password",
];

export function createLogger(opts: LoggerOptions = {}): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...opts,
  });
}

export type { Logger };
