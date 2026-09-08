import type { Money } from "@entegreflow/contracts";

export function formatMoney(m: Money | null | undefined): string {
  if (!m) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: m.currency,
    maximumFractionDigits: 0,
  }).format(m.amountMinor / 100);
}

const TL_FMT = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function formatTL(whole: number): string {
  return TL_FMT.format(whole);
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = [
  "linear-gradient(145deg,#2563eb,#1d4ed8)",
  "linear-gradient(145deg,#0e9e8e,#0f766e)",
  "linear-gradient(145deg,#c2410c,#9a3412)",
  "linear-gradient(145deg,#7c3aed,#5b21b6)",
  "linear-gradient(145deg,#db2777,#9d174d)",
  "linear-gradient(145deg,#475569,#1e293b)",
];

export function avatarFor(name: string): string {
  const idx = (name.charCodeAt(0) + name.length) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}
