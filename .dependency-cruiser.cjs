/**
 * Cross-platform import firewall (CI-enforced).
 *
 * The rules below are what make Tauri (desktop) and React Native (mobile) cheap
 * to add later: platform-neutral packages must stay free of server/Node/DOM deps,
 * and the web app must never reach into backend-only packages.
 *
 * These are BUILD GATES, not conventions. `pnpm firewall` runs this in CI.
 */

/** Packages that must remain platform-neutral (importable from web, desktop, mobile). */
const NEUTRAL = "^packages/(contracts|tokens|api-client|ui|icons|i18n)/";

/** Backend-only workspace packages the web app must never import directly. */
const BACKEND_PKGS = "^packages/(db|core|erp|mail|ai|jobs)/";

/** Server/Node/native module names neutral packages must not depend on. */
const SERVER_MODULES =
  "(^@nestjs/|^drizzle-orm|^postgres$|^pg$|^ioredis$|^bullmq$|^nodemailer$|^imapflow$|^@anthropic-ai/sdk|^argon2$|^@aws-sdk/)";

module.exports = {
  forbidden: [
    {
      name: "neutral-no-server-deps",
      comment:
        "Platform-neutral packages (contracts/tokens/api-client/ui/icons/i18n) must not import server/Node-only modules — they ship to web/desktop/mobile.",
      severity: "error",
      from: { path: NEUTRAL },
      to: {
        path: ["(^|/)node:", SERVER_MODULES, BACKEND_PKGS],
      },
    },
    {
      name: "web-no-backend-pkgs",
      comment:
        "apps/web must not import backend-only packages (db/core/erp/mail/ai/jobs). Talk to the backend over api-client only.",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: BACKEND_PKGS },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies are forbidden.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Orphaned modules (likely dead code) should be removed.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)(index|main)\\.tsx?$",
          "\\.(config|setup)\\.(c|m)?(j|t)s$",
          // Next.js App Router entrypoints are loaded by the framework, not imported.
          "(^|/)(page|layout|route|loading|error|not-found|template|default)\\.tsx?$",
          // Shared config presets are referenced by tooling, not imported in graph.
          "^packages/config/",
          // Standalone CLI scripts (run via tsx), not imported by app code.
          "(^|/)(simulate-rfq|trigger-sync|migrate|seed)\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|\\.next|\\.turbo|coverage|drizzle)(/|$)" },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
    includeOnly: "^(packages|apps)/",
  },
};
