import { describe, it, expect } from "vitest";
import { aiAnalysisSchema, messageAnalysisSchema } from "./analysis";

describe("aiAnalysisSchema", () => {
  it("accepts a well-formed model output", () => {
    const parsed = aiAnalysisSchema.parse({
      summary: "Müşteri 2 kalem KKD istiyor.",
      intents: ["Teklif talebi"],
      draftBody: "Sayın ...,\n\n[TEKLİF TABLOSU]\n\nSaygılarımızla",
      lineItems: [
        {
          requestText: "150 adet beyaz baret",
          qty: 150,
          unit: "adet",
          matchedSku: "BRT-3M-H700",
          matchConfidence: 0.92,
          ambiguous: false,
        },
      ],
      warnings: [],
    });
    expect(parsed.lineItems[0]?.matchedSku).toBe("BRT-3M-H700");
  });

  it("rejects confidence out of range", () => {
    expect(() =>
      aiAnalysisSchema.parse({
        summary: "x",
        intents: [],
        draftBody: "x",
        lineItems: [
          { requestText: "x", qty: null, unit: null, matchedSku: null, matchConfidence: 1.5, ambiguous: true },
        ],
        warnings: [],
      }),
    ).toThrow();
  });
});

describe("messageAnalysisSchema", () => {
  it("requires server-enriched fields", () => {
    const res = messageAnalysisSchema.safeParse({ summary: "x" });
    expect(res.success).toBe(false);
  });
});
