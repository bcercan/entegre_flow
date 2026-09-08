import { describe, it, expect } from "vitest";
import { buildQuoteEmail } from "./quote-email";
import type { QuoteLine } from "@entegreflow/contracts";

const lines: QuoteLine[] = [
  {
    sku: "BRT-3M-H700",
    name: "3M H-700 Baret",
    qty: 150,
    unit: "adet",
    unitPrice: { amountMinor: 13_200, currency: "TRY" },
    lineTotal: { amountMinor: 1_980_000, currency: "TRY" },
  },
];

const draft = "Sayın Yetkili,\n\n[TEKLİF TABLOSU]\n\nSaygılarımızla";

describe("buildQuoteEmail", () => {
  it("replaces the placeholder with a text + html quote table", () => {
    const { text, html } = buildQuoteEmail(draft, lines, 1_980_000, "TRY");
    expect(text).not.toContain("[TEKLİF TABLOSU]");
    expect(text).toContain("3M H-700 Baret");
    expect(text).toContain("Genel Toplam");
    expect(html).toContain("<table>");
    expect(html).toContain("3M H-700 Baret");
    expect(html).not.toContain("[TEKLİF TABLOSU]");
  });

  it("neutralizes injected markup in the outbound html (no live tags)", () => {
    const evil = "Merhaba <script>alert(1)</script> <a href='http://evil'>tık</a>\n\n[TEKLİF TABLOSU]";
    const { html } = buildQuoteEmail(evil, lines, 1_980_000, "TRY");
    // The draft prose is escaped, so injected markup becomes inert text, never
    // a live <script>/<a> tag. Only the server-built table contributes markup.
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<a href");
    expect(html).toContain("&lt;script&gt;"); // neutralized to text
  });
});
