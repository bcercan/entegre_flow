import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { pk, timestamps, tenantId } from "./_shared";

export const integrationKindEnum = pgEnum("integration_kind", ["erp", "mail", "ai"]);
export const integrationStatusEnum = pgEnum("integration_status", ["active", "disabled", "error"]);
export const riskEnum = pgEnum("risk", ["ok", "warn", "danger"]);
export const stockStateEnum = pgEnum("stock_state", ["ok", "low", "out"]);

/** A configured integration (which adapter, non-secret config). Tenant-scoped. */
export const integrations = pgTable(
  "integrations",
  {
    id: pk(),
    tenantId: tenantId(),
    kind: integrationKindEnum("kind").notNull(),
    adapter: text("adapter").notNull(), // "mock-erp" | "dia" | "imap-smtp" | "anthropic"
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    status: integrationStatusEnum("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [index("integrations_tenant_kind_idx").on(t.tenantId, t.kind)],
);

/** Envelope-encrypted credential blob for an integration. Tenant-scoped. */
export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: pk(),
    tenantId: tenantId(),
    integrationId: uuid("integration_id").notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    dekWrapped: text("dek_wrapped").notNull(),
    kekId: text("kek_id").notNull(),
    ...timestamps,
  },
  (t) => [index("integration_credentials_integration_idx").on(t.integrationId)],
);

/** Mirror of an ERP customer (cari). Tenant-scoped. */
export const customers = pgTable(
  "customers",
  {
    id: pk(),
    tenantId: tenantId(),
    erpCode: text("erp_code").notNull(),
    name: text("name").notNull(),
    segment: text("segment"),
    balanceMinor: bigint("balance_minor", { mode: "number" }).notNull().default(0),
    creditLimitMinor: bigint("credit_limit_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("TRY"),
    paymentTerm: text("payment_term"),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    risk: riskEnum("risk").notNull().default("ok"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique("customers_tenant_code_uniq").on(t.tenantId, t.erpCode)],
);

/** Catalog product mirror. Tenant-scoped. */
export const catalogItems = pgTable(
  "catalog_items",
  {
    id: pk(),
    tenantId: tenantId(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("adet"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique("catalog_items_tenant_sku_uniq").on(t.tenantId, t.sku)],
);

/** Price entry (list vs deal), optionally customer-specific. Tenant-scoped. */
export const priceEntries = pgTable(
  "price_entries",
  {
    id: pk(),
    tenantId: tenantId(),
    sku: text("sku").notNull(),
    customerCode: text("customer_code"),
    listMinor: bigint("list_minor", { mode: "number" }).notNull(),
    dealMinor: bigint("deal_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("TRY"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index("price_entries_tenant_sku_idx").on(t.tenantId, t.sku)],
);

/** Append-only stock snapshot; latest row per sku = current. Tenant-scoped. */
export const stockSnapshots = pgTable(
  "stock_snapshots",
  {
    id: pk(),
    tenantId: tenantId(),
    sku: text("sku").notNull(),
    qty: integer("qty").notNull(),
    state: stockStateEnum("state").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index("stock_snapshots_tenant_sku_idx").on(t.tenantId, t.sku, t.capturedAt)],
);
