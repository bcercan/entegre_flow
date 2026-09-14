import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createJobsClient } from "@entegreflow/jobs";

function loadEnv(): void {
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
loadEnv();

const DEMO_TENANT_ID = "00000000-0000-0000-0000-0000000000a1";
const DEMO_ACCOUNT_ID = "00000000-0000-0000-0000-0000000000c1";

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL required");
  const jobs = createJobsClient(redisUrl);
  await jobs.enqueueMailboxSync({ tenantId: DEMO_TENANT_ID, accountId: DEMO_ACCOUNT_ID });
  await jobs.close();
  console.log("[trigger-sync] mailbox.sync kuyruğa atıldı");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[trigger-sync] failed:", err);
    process.exit(1);
  },
);
