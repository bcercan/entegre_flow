/**
 * Deterministic Turkish product matcher. Used to (a) retrieve candidate SKUs
 * for the LLM prompt and (b) power the offline MockLlmProvider. Kept pure and
 * well-tested so the "brain" is verifiable without a live model.
 */

const TR_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
};

/** Lowercase (Turkish-aware) + strip diacritics + collapse to [a-z0-9 ]. */
export function normalizeTr(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(input: string): string[] {
  return normalizeTr(input).split(" ").filter((t) => t.length > 1);
}

export interface MatchCandidate {
  sku: string;
  name: string;
  aliases: string[];
}

export interface MatchResult {
  sku: string;
  confidence: number; // 0..1
}

/**
 * Match a free-text request line to the best candidate SKU.
 * Alias substring hits are strong signals; otherwise token overlap with the name.
 */
export function matchLine(text: string, candidates: MatchCandidate[]): MatchResult | null {
  const norm = normalizeTr(text);
  const reqTokens = new Set(tokens(text));
  let best: MatchResult | null = null;

  for (const cand of candidates) {
    let score = 0;
    for (const alias of cand.aliases) {
      const a = normalizeTr(alias);
      if (a && norm.includes(a)) {
        // Longer alias phrases are more specific → higher confidence.
        score = Math.max(score, a.includes(" ") ? 0.95 : 0.88);
      }
    }
    if (score === 0) {
      // Weak fallback: require >= 2 overlapping content tokens so a single
      // generic word (e.g. "koruyucu") in a descriptive sentence can't match.
      const nameTokens = tokens(cand.name).filter((t) => t.length > 3);
      const overlap = nameTokens.filter((t) => reqTokens.has(t)).length;
      if (overlap >= 2) score = Math.min(0.8, overlap * 0.3);
    }
    if (score > 0 && (!best || score > best.confidence)) {
      best = { sku: cand.sku, confidence: Number(score.toFixed(2)) };
    }
  }
  return best && best.confidence >= 0.4 ? best : null;
}

const UNIT_WORDS = ["adet", "cift", "paket", "kutu", "koli", "takim", "rulo", "metre"];

/** Extract a leading/embedded quantity + unit from a request line. */
export function extractQuantity(text: string): { qty: number | null; unit: string | null } {
  const norm = normalizeTr(text);
  // e.g. "150 adet", "200 cift", "1 000 adet", "80 cift"
  const m = norm.match(/(\d[\d.\s]*\d|\d)\s*([a-z]+)?/);
  if (!m) return { qty: null, unit: null };
  const qty = Number.parseInt(m[1]!.replace(/[.\s]/g, ""), 10);
  const rawUnit = m[2] ?? null;
  const unit = rawUnit && UNIT_WORDS.includes(rawUnit) ? rawUnit : null;
  return { qty: Number.isFinite(qty) ? qty : null, unit };
}

/** Split an email body into probable request lines (bullets / quantity lines). */
export function splitRequestLines(body: string, candidates: MatchCandidate[]): string[] {
  return body
    .split(/\r?\n|•|<\/li>|<li>|;/)
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter((l) => l.length > 2)
    .filter((l) => /\d/.test(l) || matchLine(l, candidates) !== null);
}
