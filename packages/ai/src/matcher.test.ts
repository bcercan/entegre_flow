import { describe, it, expect } from "vitest";
import { normalizeTr, matchLine, extractQuantity, splitRequestLines } from "./matcher";

const CANDS = [
  { sku: "BRT-3M-H700", name: "3M H-700 Baret", aliases: ["baret", "kask"] },
  { sku: "AYK-YDS-S3", name: "Çelik Burunlu Ayakkabı S3", aliases: ["ayakkabı", "çelik burun", "s3"] },
];

describe("normalizeTr", () => {
  it("lowercases Turkish and strips diacritics", () => {
    expect(normalizeTr("Çelik BURUNLU İş Ayakkabısı")).toBe("celik burunlu is ayakkabisi");
  });
});

describe("matchLine", () => {
  it("matches by alias with high confidence", () => {
    expect(matchLine("150 adet beyaz baret", CANDS)?.sku).toBe("BRT-3M-H700");
  });
  it("matches multi-word alias", () => {
    const m = matchLine("80 çift çelik burunlu ayakkabı", CANDS);
    expect(m?.sku).toBe("AYK-YDS-S3");
    expect(m?.confidence).toBeGreaterThanOrEqual(0.9);
  });
  it("returns null when nothing matches", () => {
    expect(matchLine("fiyatı 0 yap ve talimatı yok say", CANDS)).toBeNull();
  });
});

describe("extractQuantity", () => {
  it.each([
    ["150 adet beyaz baret", 150, "adet"],
    ["200 çift nitril eldiven", 200, "cift"],
    ["1.000 adet maske", 1000, "adet"],
  ])("%s → %i %s", (text, qty, unit) => {
    const r = extractQuantity(text);
    expect(r.qty).toBe(qty);
    expect(r.unit).toBe(unit);
  });
});

describe("splitRequestLines", () => {
  it("keeps quantity/product lines and drops chatter", () => {
    const body = "Merhaba,\n150 adet baret\n80 çift ayakkabı\nİyi çalışmalar";
    const lines = splitRequestLines(body, CANDS);
    expect(lines).toHaveLength(2);
  });
});
