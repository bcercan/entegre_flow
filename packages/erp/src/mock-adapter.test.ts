import { describe, it, expect } from "vitest";
import { MockErpAdapter, mockErpFactory } from "./mock-adapter";
import { withValidatedOutput } from "./validation";
import { ErpAdapterRegistry } from "./registry";

const ctx = { tenantId: "t1" };
const adapter = withValidatedOutput(new MockErpAdapter());

describe("MockErpAdapter", () => {
  it("resolves a customer by code with money in minor units", async () => {
    const c = await adapter.getCustomerByCode!("120.01.0118", ctx);
    expect(c?.name).toContain("Mavi Tersane");
    expect(c?.balance.amountMinor).toBe(47_200_000); // 472.000 TL → kuruş
    expect(c?.overLimit).toBe(true); // 472k > 450k limit
    expect(c?.risk).toBe("danger");
  });

  it("finds a customer by contact email (any of their addresses)", async () => {
    const c = await adapter.findCustomerByEmail!("depo@akcainsaat.com.tr", ctx);
    expect(c?.erpCode).toBe("120.01.0045");
  });

  it("returns null for an unknown email", async () => {
    expect(await adapter.findCustomerByEmail!("nope@example.com", ctx)).toBeNull();
  });

  it("returns stock with a derived state", async () => {
    const [stock] = await adapter.getStock!(["AYK-YDS-S3"], ctx);
    expect(stock?.qty).toBe(54);
    expect(stock?.state).toBe("low"); // < 100 on hand
  });

  it("returns list vs deal prices", async () => {
    const [price] = await adapter.getPrices!(["BRT-3M-H700"], null, ctx);
    expect(price?.list.amountMinor).toBe(14_500);
    expect(price?.deal.amountMinor).toBe(13_200);
  });

  it("lists the full catalog with match aliases", async () => {
    const items = await adapter.listCatalog!(ctx);
    expect(items).toHaveLength(8);
    expect(items[0]?.attributes.aliases).toBeDefined();
  });
});

describe("ErpAdapterRegistry", () => {
  it("resolves a registered adapter and rejects unknown ones", () => {
    const reg = new ErpAdapterRegistry().register(mockErpFactory);
    expect(reg.create("mock-erp").meta.id).toBe("mock-erp");
    expect(() => reg.create("sap")).toThrow(/Bilinmeyen ERP/);
  });
});
