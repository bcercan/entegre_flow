import { desc, eq } from "drizzle-orm";
import { schema, type TenantAwareDb } from "@entegreflow/db";
import type { TenantContext } from "@entegreflow/core";
import type { CatalogPort } from "@entegreflow/ai";

/**
 * DB-backed catalog access. Serves from the LOCAL ERP cache tables
 * (catalog_items / price_entries / stock_snapshots) — never a live ERP call.
 * Framework-agnostic so both the api (HTTP) and worker (queue) reuse it.
 */
export function buildDbCatalogPort(tdb: TenantAwareDb, ctx: TenantContext): CatalogPort {
  return {
    candidates: async () => {
      const items = await tdb.withTenant(ctx, (tx) => tx.select().from(schema.catalogItems));
      // Small mock catalog → the full set fits any prompt; the matcher filters.
      return items.map((i) => ({
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        aliases: Array.isArray(i.attributes?.aliases) ? (i.attributes.aliases as string[]) : [],
      }));
    },

    enrich: async (sku) =>
      tdb.withTenant(ctx, async (tx) => {
        const [item] = await tx
          .select()
          .from(schema.catalogItems)
          .where(eq(schema.catalogItems.sku, sku))
          .limit(1);
        if (!item) return null;

        const [price] = await tx
          .select()
          .from(schema.priceEntries)
          .where(eq(schema.priceEntries.sku, sku))
          .orderBy(desc(schema.priceEntries.fetchedAt))
          .limit(1);

        const [stock] = await tx
          .select()
          .from(schema.stockSnapshots)
          .where(eq(schema.stockSnapshots.sku, sku))
          .orderBy(desc(schema.stockSnapshots.capturedAt))
          .limit(1);

        return {
          name: item.name,
          unit: item.unit,
          list: price ? { amountMinor: price.listMinor, currency: "TRY" as const } : null,
          deal: price ? { amountMinor: price.dealMinor, currency: "TRY" as const } : null,
          stock: stock ? stock.qty : null,
          stockState: stock ? stock.state : null,
        };
      }),
  };
}
