import { sanitizeOutboundDraftHtml } from "@entegreflow/core";
import type { Currency, QuoteLine } from "@entegreflow/contracts";

const PLACEHOLDER = "[TEKLİF TABLOSU]";

function money(minor: number, currency: Currency): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Turn the AI draft (plain text with the [TEKLİF TABLOSU] placeholder) into a
 * sendable email. The quote table is SERVER-built from the frozen quote lines
 * (never model markup); the whole HTML is passed through the outbound sanitizer
 * (strips any injected links/scripts) before sending.
 */
export function buildQuoteEmail(
  draftText: string,
  lines: QuoteLine[],
  netMinor: number,
  currency: Currency,
): { text: string; html: string } {
  // ---- plain text ----
  const textRows = lines
    .map(
      (l) =>
        `- ${l.name}: ${l.qty} ${l.unit} × ${money(l.unitPrice.amountMinor, currency)} = ${money(
          l.lineTotal.amountMinor,
          currency,
        )}`,
    )
    .join("\n");
  const textTable = `${textRows}\nGenel Toplam (KDV hariç): ${money(netMinor, currency)}`;
  const text = draftText.replace(PLACEHOLDER, textTable);

  // ---- html ----
  const htmlRows = lines
    .map(
      (l) =>
        `<tr><td>${esc(l.name)}</td><td>${l.qty} ${esc(l.unit)}</td>` +
        `<td>${money(l.unitPrice.amountMinor, currency)}</td>` +
        `<td>${money(l.lineTotal.amountMinor, currency)}</td></tr>`,
    )
    .join("");
  const htmlTable =
    `<table><thead><tr><th>Ürün</th><th>Adet</th><th>Br. Fiyat</th><th>Tutar</th></tr></thead>` +
    `<tbody>${htmlRows}` +
    `<tr><td colspan="3">Genel Toplam (KDV hariç)</td><td>${money(netMinor, currency)}</td></tr>` +
    `</tbody></table>`;

  // Escape the prose, convert newlines to paragraphs, then splice the raw table
  // in place of the (escaped, still-literal) placeholder, then sanitize.
  const escapedPlaceholder = esc(PLACEHOLDER);
  const prose = esc(draftText)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const rawHtml = prose.replace(escapedPlaceholder, htmlTable);
  const html = sanitizeOutboundDraftHtml(rawHtml);

  return { text, html };
}
