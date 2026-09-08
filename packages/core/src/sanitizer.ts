import sanitizeHtml from "sanitize-html";

/**
 * One shared sanitizer applied on BOTH sides:
 *  - inbound: rendering untrusted received email HTML
 *  - outbound: the AI-generated draft, BEFORE it is sent to a customer
 *
 * Outbound is stricter: the model must not inject links or images into
 * customer-facing mail (anti prompt-injection / anti phishing-via-our-domain).
 */

const INBOUND: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u", "s", "blockquote", "span", "div",
    "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "table", "thead", "tbody",
    "tr", "th", "td", "pre", "code", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    span: ["style"],
    "*": [],
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
  },
};

const OUTBOUND: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u",
    "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    th: ["class"],
    td: ["class", "colspan"],
    table: ["class"],
  },
  // No links, no images — strip them and their contents' markup.
  disallowedTagsMode: "discard",
};

export function sanitizeInboundHtml(html: string): string {
  return sanitizeHtml(html, INBOUND);
}

export function sanitizeOutboundDraftHtml(html: string): string {
  return sanitizeHtml(html, OUTBOUND);
}

/** Strip ALL markup → plain text (for snippets / previews). */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
