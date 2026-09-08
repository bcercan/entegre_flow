/* eslint-disable no-console -- dev script: stdout logging is intentional. */
/**
 * Dev helper: simulate an inbound RFQ email arriving (stands in for the IMAP
 * fetch, which needs a live mailbox). Inserts a fresh inbound message and
 * enqueues `message.analyze` — the running worker then auto-analyzes it.
 *
 *   pnpm --filter @entegreflow/worker simulate
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDbClients, schema } from "@entegreflow/db";
import { createJobsClient } from "@entegreflow/jobs";

const DEMO_TENANT_ID = "00000000-0000-0000-0000-0000000000a1";
const ACCOUNT_ID = "00000000-0000-0000-0000-0000000000c1"; // seeded email account

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  if (!dbUrl || !redisUrl) throw new Error("DATABASE_URL and REDIS_URL are required");

  const clients = createDbClients({ url: dbUrl });
  const db = clients.system;
  const jobs = createJobsClient(redisUrl);

  try {
    const [demir] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.erpCode, "120.01.0203"))
      .limit(1);

    const messageId = randomUUID();
    const threadId = randomUUID();
    const rfc822 = `sim-${new Date().getTime()}@demiryapi.com`;
    const subject = "Yeni Teklif — Eldiven, Maske ve Gözlük";

    await db.insert(schema.emailThreads).values({
      id: threadId,
      tenantId: DEMO_TENANT_ID,
      accountId: ACCOUNT_ID,
      subject,
      customerId: demir?.id ?? null,
      status: "inbox",
    });

    await db.insert(schema.emailMessages).values({
      id: messageId,
      tenantId: DEMO_TENANT_ID,
      threadId,
      accountId: ACCOUNT_ID,
      direction: "inbound",
      messageId: rfc822,
      from: { name: "Burak Demir", address: "burak.demir@demiryapi.com" },
      to: [{ name: null, address: "satis@entegresafety.com" }],
      subject,
      snippet: "300 çift nitril eldiven, 200 adet FFP3 maske ve 80 adet gözlük…",
      bodyText:
        "Merhaba,\n\nŞantiyemiz için aşağıdaki KKD'ler için teklif rica ederiz:\n" +
        "300 çift nitril kaplı iş eldiveni\n" +
        "200 adet FFP3 toz maskesi\n" +
        "80 adet koruyucu gözlük\n\n" +
        "Stok durumu ve fiyat bilgisi bekliyoruz.\n\nBurak Demir\nDemir Yapı Taahhüt Ltd.",
      receivedAt: new Date(),
      isRead: false,
      aiStatus: "pending",
    });

    await jobs.enqueueAnalyze({ tenantId: DEMO_TENANT_ID, messageId });
    console.log(`[simulate] inbound RFQ eklendi + analiz kuyruğa atıldı: message ${messageId}`);
  } finally {
    await jobs.close();
    await clients.close();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[simulate] failed:", err);
    process.exit(1);
  },
);
