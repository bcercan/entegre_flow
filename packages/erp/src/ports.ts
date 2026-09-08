import type {
  CatalogItem,
  Customer,
  OrderHistoryEntry,
  PriceQuote,
  StockLevel,
} from "@entegreflow/contracts";

/** Minimal per-call context (which tenant is asking). */
export interface ErpContext {
  tenantId: string;
}

export type ErpCapability = "customers" | "stock" | "price" | "orders" | "history";

// ---- capability-segregated provider interfaces -----------------------------

export interface CustomerProvider {
  getCustomerByCode(code: string, ctx: ErpContext): Promise<Customer | null>;
  /** Only trusted after DKIM/DMARC pass — see the mail layer. */
  findCustomerByEmail(email: string, ctx: ErpContext): Promise<Customer | null>;
  getOrderHistory(code: string, limit: number, ctx: ErpContext): Promise<OrderHistoryEntry[]>;
}

export interface StockProvider {
  getStock(skus: string[], ctx: ErpContext): Promise<StockLevel[]>;
}

export interface PriceProvider {
  getPrices(skus: string[], customerCode: string | null, ctx: ErpContext): Promise<PriceQuote[]>;
  listCatalog(ctx: ErpContext): Promise<CatalogItem[]>;
}

export interface CreateOrderInput {
  customerCode: string;
  lines: Array<{ sku: string; qty: number }>;
}
export interface CreateOrderResult {
  orderId: string;
}
export interface OrderProvider {
  createOrder(input: CreateOrderInput, ctx: ErpContext): Promise<CreateOrderResult>;
}

export interface ErpAdapterMeta {
  id: string;
  name: string;
  capabilities: readonly ErpCapability[];
}

/**
 * An ERP adapter implements whichever capabilities its meta declares. The
 * registry resolves one per tenant/integration; the sync worker calls it and
 * validates its output at the boundary (see `withValidatedOutput`).
 */
export interface ErpAdapter
  extends Partial<CustomerProvider & StockProvider & PriceProvider & OrderProvider> {
  readonly meta: ErpAdapterMeta;
  healthCheck(ctx: ErpContext): Promise<{ ok: boolean; latencyMs: number }>;
}
