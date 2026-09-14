/**
 * Dev seed: put a couple of sample attachments in MinIO and link them to the
 * first inbound message, so the attachments UI has something to show.
 * Run: pnpm --filter @entegreflow/api exec tsx src/attachments/seed-attachment.ts
 */
/* eslint-disable no-console -- one-off CLI script */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { schema } from "@entegreflow/db";
import { loadConfig } from "@entegreflow/server";

const SAMPLES: Array<{ name: string; mime: string; body: string }> = [
  {
    name: "Sahantiye-KKD-Sartname.txt",
    mime: "text/plain; charset=utf-8",
    body:
      "TUZLA ŞANTİYE — KKD TEKNİK ŞARTNAME\n\n" +
      "1) Baret: CE / EN 397, beyaz, ayarlanabilir kafa bandı.\n" +
      "2) İş eldiveni: nitril kaplı, EN 388.\n" +
      "3) İş ayakkabısı: çelik burunlu S3, bedenler 40-45.\n" +
      "4) Hi-vis yelek: reflektörlü, EN ISO 20471.\n\n" +
      "Tüm ürünler CE belgeli olacaktır.\n",
  },
  {
    name: "Talep-Kalemleri.csv",
    mime: "text/csv; charset=utf-8",
    body:
      "Ürün,Adet,Birim\n" +
      "Beyaz baret (CE/EN 397),150,adet\n" +
      "Nitril kaplı iş eldiveni,200,çift\n" +
      "Çelik burunlu iş ayakkabısı (S3),80,çift\n" +
      "Reflektörlü hi-vis yelek,120,adet\n",
  },
];

async function main(): Promise<void> {
  const cfg = loadConfig();
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL (or DATABASE_URL) required");

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  const s3 = new S3Client({
    endpoint: cfg.S3_ENDPOINT,
    region: cfg.S3_REGION,
    credentials: { accessKeyId: cfg.S3_ACCESS_KEY, secretAccessKey: cfg.S3_SECRET_KEY },
    forcePathStyle: cfg.S3_FORCE_PATH_STYLE,
  });

  try {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: cfg.S3_BUCKET }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: cfg.S3_BUCKET }));
      console.log(`[seed-attachment] created bucket ${cfg.S3_BUCKET}`);
    }

    const [msg] = await db
      .select({ id: schema.emailMessages.id, tenantId: schema.emailMessages.tenantId })
      .from(schema.emailMessages)
      .where(eq(schema.emailMessages.direction, "inbound"))
      .orderBy(schema.emailMessages.receivedAt)
      .limit(1);
    if (!msg) {
      console.log("[seed-attachment] no inbound message found — run db:seed first");
      return;
    }

    for (const s of SAMPLES) {
      const [existing] = await db
        .select({ id: schema.attachments.id })
        .from(schema.attachments)
        .where(
          and(
            eq(schema.attachments.messageId, msg.id),
            eq(schema.attachments.filenameDisplay, s.name),
          ),
        )
        .limit(1);
      if (existing) {
        console.log(`[seed-attachment] ${s.name} already linked — skipping`);
        continue;
      }
      const bytes = Buffer.from(s.body, "utf-8");
      const storageKey = `attachments/${msg.id}/${randomUUID()}`;
      await s3.send(
        new PutObjectCommand({ Bucket: cfg.S3_BUCKET, Key: storageKey, Body: bytes, ContentType: s.mime }),
      );
      await db.insert(schema.attachments).values({
        tenantId: msg.tenantId,
        messageId: msg.id,
        filenameDisplay: s.name,
        storageKey,
        mime: s.mime,
        sizeBytes: bytes.length,
        scanned: true,
      });
      console.log(`[seed-attachment] linked ${s.name} (${bytes.length} B)`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[seed-attachment] failed:", err);
    process.exit(1);
  },
);
