import type { Currency } from "@entegreflow/contracts";

/** Canonical mock ERP dataset (mirrors the prototype's data.jsx). TL values. */

const CURRENCY: Currency = "TRY";
export const tlMoney = (tl: number) => ({ amountMinor: Math.round(tl * 100), currency: CURRENCY });

export interface RawProduct {
  sku: string;
  name: string;
  unit: string;
  icon: string;
  list: number;
  deal: number;
  stock: number;
  /** Match aliases (lowercased) used by the fuzzy matcher. */
  aliases: string[];
}

export const MOCK_PRODUCTS: RawProduct[] = [
  { sku: "BRT-3M-H700", name: "3M H-700 Baret — Beyaz (EN 397)", unit: "adet", icon: "helmet", list: 145, deal: 132, stock: 1240, aliases: ["baret", "kask", "helmet", "beyaz baret"] },
  { sku: "ELD-NTR-201", name: "Nitril Kaplı İş Eldiveni — Oxxa X-Pro", unit: "çift", icon: "glove", list: 38, deal: 34, stock: 3600, aliases: ["eldiven", "iş eldiveni", "nitril", "glove"] },
  { sku: "AYK-YDS-S3", name: "YDS Çelik Burunlu İş Ayakkabısı S3", unit: "çift", icon: "boot", list: 720, deal: 680, stock: 54, aliases: ["ayakkabı", "ayakkabi", "çelik burun", "celik burun", "bot", "s3", "iş ayakkabısı"] },
  { sku: "YLK-HV-EN20", name: "Reflektörlü Hi-Vis Yelek (EN ISO 20471)", unit: "adet", icon: "vest", list: 95, deal: 88, stock: 900, aliases: ["yelek", "hi-vis", "hivis", "reflektör", "reflektif"] },
  { sku: "MSK-3M-9332", name: "3M Aura 9332+ FFP3 Toz Maskesi", unit: "adet", icon: "mask", list: 42, deal: 38, stock: 4200, aliases: ["maske", "ffp3", "toz maske", "toz maskesi", "respiratör", "solunum"] },
  { sku: "KLK-3M-X4A", name: "3M Peltor X4A Kulak Koruyucu", unit: "adet", icon: "ear", list: 320, deal: 298, stock: 240, aliases: ["kulaklık", "kulaklik", "kulak koruyucu", "kulak"] },
  { sku: "GZL-UVEX-PH", name: "Uvex Pheos İş Güvenliği Gözlüğü", unit: "adet", icon: "glasses", list: 110, deal: 102, stock: 410, aliases: ["gözlük", "gozluk", "koruyucu gözlük", "güvenlik gözlüğü"] },
  { sku: "KMR-PRS-EN361", name: "Paraşüt Tipi Emniyet Kemeri (EN 361)", unit: "adet", icon: "harness", list: 1450, deal: 1380, stock: 120, aliases: ["kemer", "emniyet kemeri", "paraşüt", "parasut", "yükseklik", "harness"] },
];

export interface RawHistory {
  date: string; // ISO
  description: string;
  amount: number; // TL
}

export interface RawCustomer {
  erpCode: string;
  name: string;
  segment: string;
  balance: number; // TL
  limit: number; // TL
  term: string;
  risk: "ok" | "warn" | "danger";
  emails: string[];
  lastOrderAt: string; // ISO
  history: RawHistory[];
}

export const MOCK_CUSTOMERS: RawCustomer[] = [
  {
    erpCode: "120.01.0045", name: "Akça İnşaat A.Ş.", segment: "Bayi · A Sınıfı",
    balance: 248500, limit: 500000, term: "60 gün", risk: "ok",
    emails: ["m.yilmaz@akcainsaat.com.tr", "depo@akcainsaat.com.tr"], lastOrderAt: "2026-05-12",
    history: [
      { date: "2026-05-12", description: "Baret + eldiven sevkiyatı", amount: 64200 },
      { date: "2026-03-18", description: "Hi-vis yelek (200 ad.)", amount: 17600 },
      { date: "2026-02-04", description: "Toz maskesi + gözlük", amount: 23800 },
    ],
  },
  {
    erpCode: "120.01.0118", name: "Mavi Tersane San. Ltd.", segment: "Anahtar Müşteri",
    balance: 472000, limit: 450000, term: "45 gün", risk: "danger",
    emails: ["selin@mavitersane.com"], lastOrderAt: "2026-05-28",
    history: [
      { date: "2026-05-28", description: "FFP3 maske (1000 ad.)", amount: 38000 },
      { date: "2026-04-30", description: "Emniyet kemeri + halat", amount: 112400 },
    ],
  },
  {
    erpCode: "120.01.0203", name: "Demir Yapı Taahhüt Ltd.", segment: "Bayi · B Sınıfı",
    balance: 86200, limit: 300000, term: "30 gün", risk: "ok",
    emails: ["burak.demir@demiryapi.com"], lastOrderAt: "2026-06-02",
    history: [
      { date: "2026-06-02", description: "Eldiven + gözlük + maske", amount: 28940 },
      { date: "2026-05-15", description: "Eldiven + gözlük + maske", amount: 28100 },
    ],
  },
  {
    erpCode: "120.01.0077", name: "Özkan Endüstriyel Tic.", segment: "Perakende",
    balance: 19400, limit: 150000, term: "Peşin", risk: "ok",
    emails: ["ayse@ozkanendustri.com"], lastOrderAt: "2026-04-10",
    history: [{ date: "2026-04-10", description: "Eldiven (100 çift)", amount: 3800 }],
  },
];

export function stockStateFor(qty: number, requested = 0): "ok" | "low" | "out" {
  if (qty <= 0) return "out";
  if (requested > 0 && qty < requested) return "low";
  if (qty < 100) return "low";
  return "ok";
}
