import {
  catalogItemSchema,
  customerSchema,
  orderHistoryEntrySchema,
  priceQuoteSchema,
  stockLevelSchema,
} from "@entegreflow/contracts";
import { z } from "zod";
import type { ErpAdapter } from "./ports";

/**
 * Wrap an adapter so EVERY output is zod-validated at the boundary. A
 * misbehaving/compromised ERP therefore cannot inject malformed data
 * downstream into the AI pipeline or the DB cache.
 */
export function withValidatedOutput(adapter: ErpAdapter): ErpAdapter {
  const wrapped: ErpAdapter = {
    meta: adapter.meta,
    healthCheck: (ctx) => adapter.healthCheck(ctx),
  };

  if (adapter.getCustomerByCode) {
    const fn = adapter.getCustomerByCode.bind(adapter);
    wrapped.getCustomerByCode = async (code, ctx) => {
      const r = await fn(code, ctx);
      return r ? customerSchema.parse(r) : null;
    };
  }
  if (adapter.findCustomerByEmail) {
    const fn = adapter.findCustomerByEmail.bind(adapter);
    wrapped.findCustomerByEmail = async (email, ctx) => {
      const r = await fn(email, ctx);
      return r ? customerSchema.parse(r) : null;
    };
  }
  if (adapter.getOrderHistory) {
    const fn = adapter.getOrderHistory.bind(adapter);
    wrapped.getOrderHistory = async (code, limit, ctx) =>
      z.array(orderHistoryEntrySchema).parse(await fn(code, limit, ctx));
  }
  if (adapter.getStock) {
    const fn = adapter.getStock.bind(adapter);
    wrapped.getStock = async (skus, ctx) => z.array(stockLevelSchema).parse(await fn(skus, ctx));
  }
  if (adapter.getPrices) {
    const fn = adapter.getPrices.bind(adapter);
    wrapped.getPrices = async (skus, code, ctx) =>
      z.array(priceQuoteSchema).parse(await fn(skus, code, ctx));
  }
  if (adapter.listCatalog) {
    const fn = adapter.listCatalog.bind(adapter);
    wrapped.listCatalog = async (ctx) => z.array(catalogItemSchema).parse(await fn(ctx));
  }
  if (adapter.createOrder) {
    wrapped.createOrder = adapter.createOrder.bind(adapter);
  }
  return wrapped;
}
