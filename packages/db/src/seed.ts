/**
 * Dev/demo seed (idempotent). Mirrors the prototype's data.jsx so the app has
 * a realistic tenant out of the box. Runs via the SYSTEM (owner) connection.
 *
 * Money is stored in minor units (kuruş): TL value * 100.
 */
/* eslint-disable no-console -- CLI script: stdout logging is intentional. */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  EnvelopeCrypto,
  EnvKeyProvider,
  credentialAad,
  hashPassword,
} from "@entegreflow/core";
import { and, eq } from "drizzle-orm";
import { createDbClients } from "./client";
import * as schema from "./schema";

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

const TL = (whole: number) => whole * 100;

const DEMO_TENANT_ID = "00000000-0000-0000-0000-0000000000a1";
const DEMO_USER_ID = "00000000-0000-0000-0000-0000000000b1";
const DEMO_ACCOUNT_ID = "00000000-0000-0000-0000-0000000000c1";
const MAIL_INTEGRATION_ID = "00000000-0000-0000-0000-0000000000f1";
const MAIL_CREDENTIAL_ID = "00000000-0000-0000-0000-0000000000f2";
const DEMO_THREAD_ID = "00000000-0000-0000-0000-0000000000d1";
const DEMO_MESSAGE_ID = "00000000-0000-0000-0000-0000000000e1";
// Dev login: admin@entegreflow.local / Passw0rd!  (hashed with Argon2id below)
const DEV_PASSWORD = "Passw0rd!";

const CUSTOMERS = [
  { erpCode: "120.01.0045", name: "Akça İnşaat A.Ş.", segment: "Bayi · A Sınıfı", balance: 248500, limit: 500000, term: "60 gün", risk: "ok" as const },
  { erpCode: "120.01.0118", name: "Mavi Tersane San. Ltd.", segment: "Anahtar Müşteri", balance: 472000, limit: 450000, term: "45 gün", risk: "danger" as const },
  { erpCode: "120.01.0203", name: "Demir Yapı Taahhüt Ltd.", segment: "Bayi · B Sınıfı", balance: 86200, limit: 300000, term: "30 gün", risk: "ok" as const },
  { erpCode: "120.01.0077", name: "Özkan Endüstriyel Tic.", segment: "Perakende", balance: 19400, limit: 150000, term: "Peşin", risk: "ok" as const },
];

const PRODUCTS = [
  { sku: "BRT-3M-H700", name: "3M H-700 Baret — Beyaz (EN 397)", unit: "adet", icon: "helmet", list: 145, deal: 132, stock: 1240 },
  { sku: "ELD-NTR-201", name: "Nitril Kaplı İş Eldiveni — Oxxa X-Pro", unit: "çift", icon: "glove", list: 38, deal: 34, stock: 3600 },
  { sku: "AYK-YDS-S3", name: "YDS Çelik Burunlu İş Ayakkabısı S3", unit: "çift", icon: "boot", list: 720, deal: 680, stock: 54 },
  { sku: "YLK-HV-EN20", name: "Reflektörlü Hi-Vis Yelek (EN ISO 20471)", unit: "adet", icon: "vest", list: 95, deal: 88, stock: 900 },
  { sku: "MSK-3M-9332", name: "3M Aura 9332+ FFP3 Toz Maskesi", unit: "adet", icon: "mask", list: 42, deal: 38, stock: 4200 },
  { sku: "KLK-3M-X4A", name: "3M Peltor X4A Kulak Koruyucu", unit: "adet", icon: "ear", list: 320, deal: 298, stock: 240 },
  { sku: "GZL-UVEX-PH", name: "Uvex Pheos İş Güvenliği Gözlüğü", unit: "adet", icon: "glasses", list: 110, deal: 102, stock: 410 },
  { sku: "KMR-PRS-EN361", name: "Paraşüt Tipi Emniyet Kemeri (EN 361)", unit: "adet", icon: "harness", list: 1450, deal: 1380, stock: 120 },
];

function stockState(qty: number): "ok" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qty < 100) return "low";
  return "ok";
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL (or DATABASE_URL) is required");
  const clients = createDbClients({ url });
  const db = clients.system; // BYPASSRLS owner — can write tenant rows directly
  const passwordHash = await hashPassword(DEV_PASSWORD);

  try {
    await db
      .insert(schema.tenants)
      .values({
        id: DEMO_TENANT_ID,
        name: "Entegre Safety (Demo)",
        slug: "entegre-safety",
        settings: { locale: "tr", currency: "TRY", accent: "#2563eb", density: "comfortable" },
      })
      .onConflictDoNothing();

    await db
      .insert(schema.users)
      .values({
        id: DEMO_USER_ID,
        email: "admin@entegreflow.local",
        displayName: "Ercan (Demo)",
        passwordHash,
      })
      .onConflictDoUpdate({ target: schema.users.id, set: { passwordHash } });

    await db
      .insert(schema.memberships)
      .values({ tenantId: DEMO_TENANT_ID, userId: DEMO_USER_ID, role: "owner", status: "active" })
      .onConflictDoNothing();

    await db
      .insert(schema.integrations)
      .values({
        tenantId: DEMO_TENANT_ID,
        kind: "erp",
        adapter: "mock-erp",
        name: "Mock ERP (demo)",
        config: { seed: "data.jsx" },
        status: "active",
      })
      .onConflictDoNothing();

    for (const c of CUSTOMERS) {
      await db
        .insert(schema.customers)
        .values({
          tenantId: DEMO_TENANT_ID,
          erpCode: c.erpCode,
          name: c.name,
          segment: c.segment,
          balanceMinor: TL(c.balance),
          creditLimitMinor: TL(c.limit),
          currency: "TRY",
          paymentTerm: c.term,
          risk: c.risk,
          syncedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    for (const p of PRODUCTS) {
      await db
        .insert(schema.catalogItems)
        .values({
          tenantId: DEMO_TENANT_ID,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          attributes: { icon: p.icon },
          syncedAt: new Date(),
        })
        .onConflictDoNothing();
      await db.insert(schema.priceEntries).values({
        tenantId: DEMO_TENANT_ID,
        sku: p.sku,
        listMinor: TL(p.list),
        dealMinor: TL(p.deal),
        currency: "TRY",
      });
      await db.insert(schema.stockSnapshots).values({
        tenantId: DEMO_TENANT_ID,
        sku: p.sku,
        qty: p.stock,
        state: stockState(p.stock),
      });
    }
    // --- mailbox + a seeded inbound RFQ (the Akça m1 request) --------------
    await db
      .insert(schema.emailAccounts)
      .values({
        id: DEMO_ACCOUNT_ID,
        tenantId: DEMO_TENANT_ID,
        provider: "imap-smtp",
        address: "satis@entegresafety.com",
        status: "active",
      })
      .onConflictDoNothing();

    const [akca] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, DEMO_TENANT_ID),
          eq(schema.customers.erpCode, "120.01.0045"),
        ),
      );

    const [mavi] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, DEMO_TENANT_ID),
          eq(schema.customers.erpCode, "120.01.0118"),
        ),
      );

    const [demir] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, DEMO_TENANT_ID),
          eq(schema.customers.erpCode, "120.01.0203"),
        ),
      );

    const [ozkan] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, DEMO_TENANT_ID),
          eq(schema.customers.erpCode, "120.01.0077"),
        ),
      );

    const now = new Date();
    const todayAt = new Date(now.getTime() - 2 * 3600 * 1000);
    const yesterdayAt = new Date(now.getTime() - 26 * 3600 * 1000);
    const thisWeekAt = new Date(now.getTime() - 3 * 86400 * 1000);
    const olderThisWeekAt = new Date(now.getTime() - 5 * 86400 * 1000);

    const demoThreads = [
      {
        threadId: DEMO_THREAD_ID,
        messageId: DEMO_MESSAGE_ID,
        customerId: akca?.id ?? null,
        subject: "Teklif Talebi — Şantiye KKD İhtiyacı (Acil)",
        snippet: "Tuzla şantiyemiz için baret, eldiven ve çelik burunlu ayakkabı teklifi rica ederiz...",
        fromName: "Mehmet Yılmaz",
        fromEmail: "m.yilmaz@akcainsaat.com.tr",
        receivedAt: todayAt,
        isRead: false,
        aiStatus: "pending" as const,
      },
      {
        threadId: "00000000-0000-0000-0000-0000000000d2",
        messageId: "00000000-0000-0000-0000-0000000000e2",
        customerId: mavi?.id ?? null,
        subject: "Tersane Bakım Ekipmanları ve Koruyucu Donanım Talebi",
        snippet: "Tersanemiz için 200 adet baret ve 100 adet kaynakçı gözlüğü...",
        fromName: "Mavi Tersane",
        fromEmail: "satinalma@mavitersane.com",
        receivedAt: yesterdayAt,
        isRead: false,
        aiStatus: "risk" as const,
      },
      {
        threadId: "00000000-0000-0000-0000-0000000000d3",
        messageId: "00000000-0000-0000-0000-0000000000e3",
        customerId: demir?.id ?? null,
        subject: "İş Güvenliği Malzemeleri Fiyat Teklifi",
        snippet: "Merhabalar, ekte yer alan malzeme listesi için birim fiyat...",
        fromName: "Burak Demir",
        fromEmail: "burak.demir@demiryapi.com",
        receivedAt: thisWeekAt,
        isRead: false,
        aiStatus: "ready" as const,
      },
      {
        threadId: "00000000-0000-0000-0000-0000000000d4",
        messageId: "00000000-0000-0000-0000-0000000000e4",
        customerId: ozkan?.id ?? null,
        subject: "Aylık KKD Sevkiyatı ve Baret Siparişi",
        snippet: "Önümüzdeki ayın ilk haftası teslim edilmek üzere 3M baret...",
        fromName: "Özkan Ticaret",
        fromEmail: "siparis@ozkanendustriyel.com",
        receivedAt: olderThisWeekAt,
        isRead: true,
        aiStatus: "info" as const,
      },
    ];

    const rfqBody = [
      "Merhaba,",
      "",
      "Tuzla'daki yeni şantiyemizin saha ekibi için aşağıdaki kişisel koruyucu",
      "donanımlara ihtiyacımız var. CE belgeli ürünler olması şart.",
      "",
      "150 adet beyaz baret (CE / EN 397)",
      "200 çift nitril kaplı iş eldiveni",
      "80 çift çelik burunlu iş ayakkabısı (S3) — bedenler karışık (40–45)",
      "120 adet reflektörlü hi-vis yelek",
      "",
      "İşe başlama tarihimiz yaklaştığı için ürünlere acil ihtiyacımız var.",
      "",
      "İyi çalışmalar,",
    ].join("\n");

    for (const t of demoThreads) {
      await db
        .insert(schema.emailThreads)
        .values({
          id: t.threadId,
          tenantId: DEMO_TENANT_ID,
          accountId: DEMO_ACCOUNT_ID,
          subject: t.subject,
          customerId: t.customerId,
          status: "inbox",
          lastMessageAt: t.receivedAt,
          messageCount: 1,
        })
        .onConflictDoUpdate({
          target: schema.emailThreads.id,
          set: {
            subject: t.subject,
            lastMessageAt: t.receivedAt,
            customerId: t.customerId,
          },
        });

      await db
        .insert(schema.emailMessages)
        .values({
          id: t.messageId,
          tenantId: DEMO_TENANT_ID,
          threadId: t.threadId,
          accountId: DEMO_ACCOUNT_ID,
          direction: "inbound",
          messageId: `<${t.messageId}@entegreflow.local>`,
          from: { name: t.fromName, address: t.fromEmail },
          to: [{ name: "Satış", address: "satis@entegresafety.com" }],
          subject: t.subject,
          snippet: t.snippet,
          bodyText: `${rfqBody}\n${t.fromName}`,
          receivedAt: t.receivedAt,
          isRead: t.isRead,
          aiStatus: t.aiStatus,
        })
        .onConflictDoUpdate({
          target: schema.emailMessages.id,
          set: {
            receivedAt: t.receivedAt,
            isRead: t.isRead,
            aiStatus: t.aiStatus,
            snippet: t.snippet,
          },
        });
    }

    // --- IMAP mailbox integration (GreenMail dev) with an ENCRYPTED credential -
    const kek = process.env.APP_ENCRYPTION_KEY;
    if (kek) {
      await db
        .insert(schema.integrations)
        .values({
          id: MAIL_INTEGRATION_ID,
          tenantId: DEMO_TENANT_ID,
          kind: "mail",
          adapter: "imap-smtp",
          name: "GreenMail (dev)",
          config: { host: "localhost", imapPort: 3243 },
          status: "active",
        })
        .onConflictDoNothing();

      const crypto = new EnvelopeCrypto(
        new EnvKeyProvider(kek, process.env.APP_ENCRYPTION_KEY_ID ?? "kek-1"),
      );
      // GreenMail has auth disabled → any password works; still stored encrypted.
      const blob = crypto.encrypt("dev-imap-pass", credentialAad(DEMO_TENANT_ID, MAIL_INTEGRATION_ID));
      await db
        .insert(schema.integrationCredentials)
        .values({
          id: MAIL_CREDENTIAL_ID,
          tenantId: DEMO_TENANT_ID,
          integrationId: MAIL_INTEGRATION_ID,
          ciphertext: blob.ciphertext,
          iv: blob.iv,
          authTag: blob.authTag,
          dekWrapped: blob.dekWrapped,
          kekId: blob.kekId,
        })
        .onConflictDoNothing();

      await db
        .update(schema.emailAccounts)
        .set({
          inboundConfig: {
            host: "localhost",
            port: 3243,
            secure: false,
            user: "satis@entegresafety.com",
          },
          credentialId: MAIL_CREDENTIAL_ID,
        })
        .where(eq(schema.emailAccounts.id, DEMO_ACCOUNT_ID));
    } else {
      console.warn("[seed] APP_ENCRYPTION_KEY yok — IMAP hesabı atlandı.");
    }

    // --- sender → customer mapping (so ingested mail links to a cari) ---------
    if (demir) {
      await db
        .insert(schema.contactCustomerMap)
        .values({
          tenantId: DEMO_TENANT_ID,
          contactEmail: "burak.demir@demiryapi.com",
          customerId: demir.id,
          verified: true,
        })
        .onConflictDoNothing();
    }

    console.log("[seed] demo tenant + catalog + customers + inbound RFQ + IMAP account seeded");
  } finally {
    await clients.close();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  },
);
