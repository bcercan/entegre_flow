import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "EntegreFlow — AI Satış & Teklif Asistanı",
  description:
    "Gelen teklif taleplerini yapay zekâ ile analiz eden, ERP entegre satış asistanı.",
};

// Uses the native Segoe UI / system font stack (Outlook look) — no web fonts loaded.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" data-density="comfortable" data-dark="true">
      <body>{children}</body>
    </html>
  );
}
