import type {
  CatalogItem,
  Customer,
  OrderHistoryEntry,
  PriceQuote,
  StockLevel,
} from "@entegreflow/contracts";
import type { ErpAdapter, ErpContext } from "./ports";
import type { ErpAdapterFactory } from "./registry";
import { MOCK_CUSTOMERS, MOCK_PRODUCTS, stockStateFor, tlMoney } from "./mock-data";

/**
 * Reference ERP adapter for Phase 1 — stands in for Dia/Logo/Netsis. Returns
 * the canonical dataset; the sync worker mirrors this into the local cache
 * tables, and the Dia adapter (Phase 2) swaps in behind the same interface.
 */
export class MockErpAdapter implements ErpAdapter {
  readonly meta = {
    id: "mock-erp",
    name: "Mock ERP (referans)",
    capabilities: ["customers", "stock", "price", "history"] as const,
  };

  private toCustomer(c: (typeof MOCK_CUSTOMERS)[number]): Customer {
    return {
      erpCode: c.erpCode,
      name: c.name,
      segment: c.segment,
      balance: tlMoney(c.balance),
      creditLimit: tlMoney(c.limit),
      paymentTerm: c.term,
      lastOrderAt: c.lastOrderAt,
      risk: c.risk,
      overLimit: c.balance > c.limit,
      syncedAt: null,
    };
  }

  async getCustomerByCode(code: string): Promise<Customer | null> {
    const c = MOCK_CUSTOMERS.find((x) => x.erpCode === code);
    return c ? this.toCustomer(c) : null;
  }

  async findCustomerByEmail(email: string): Promise<Customer | null> {
    const needle = email.toLowerCase().trim();
    const c = MOCK_CUSTOMERS.find((x) => x.emails.some((e) => e.toLowerCase() === needle));
    return c ? this.toCustomer(c) : null;
  }

  async getOrderHistory(code: string, limit: number): Promise<OrderHistoryEntry[]> {
    const c = MOCK_CUSTOMERS.find((x) => x.erpCode === code);
    if (!c) return [];
    return c.history.slice(0, limit).map((h) => ({
      date: h.date,
      description: h.description,
      amount: tlMoney(h.amount),
    }));
  }

  async getStock(skus: string[]): Promise<StockLevel[]> {
    return skus.flatMap((sku) => {
      const p = MOCK_PRODUCTS.find((x) => x.sku === sku);
      if (!p) return [];
      return [{ sku, qty: p.stock, state: stockStateFor(p.stock), capturedAt: null }];
    });
  }

  async getPrices(skus: string[]): Promise<PriceQuote[]> {
    return skus.flatMap((sku) => {
      const p = MOCK_PRODUCTS.find((x) => x.sku === sku);
      if (!p) return [];
      return [
        { sku, list: tlMoney(p.list), deal: tlMoney(p.deal), customerCode: null, fetchedAt: null },
      ];
    });
  }

  async listCatalog(): Promise<CatalogItem[]> {
    return MOCK_PRODUCTS.map((p) => ({
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      attributes: { icon: p.icon, aliases: p.aliases },
    }));
  }

  async healthCheck(_ctx: ErpContext): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 0 };
  }
}

export const mockErpFactory: ErpAdapterFactory = {
  id: "mock-erp",
  create: () => new MockErpAdapter(),
};
