# EntegreFlow

AI Satış & Teklif Asistanı — gelen RFQ (teklif talebi) e-postalarını yapay zekâ ile analiz edip, ERP'den stok/fiyat/cari verisiyle zenginleştirilmiş teklif taslakları üreten çok kiracılı (multi-tenant) SaaS platformu.

> Online (web) önce; mimari masaüstü (Tauri) ve mobil (React Native) için kod paylaşımına hazır.

## Mimari özet

- **TypeScript full-stack** monorepo (pnpm + Turborepo, Node 22).
- **apps/api** — NestJS (HTTP: tRPC + ince REST/health). Tek tarayıcıya bakan servis.
- **apps/worker** — NestJS standalone; BullMQ tüketicileri (mail sync, AI analiz, ERP sync, gönderim).
- **apps/web** — Next.js 15 (App Router). Tasarım sistemi prototipten birebir taşındı.
- **PostgreSQL** + Row-Level Security (kiracı izolasyonu) · **Redis** (BullMQ) · **MinIO/S3** (ekler).
- **Adapter portları**: ERP-agnostik (mock → Dia → Logo/Netsis), Mailbox (IMAP/SMTP → Graph/Gmail), LLM (Anthropic Claude).

Detaylı mimari ve yol haritası: `docs/ARCHITECTURE.md`.

## Paketler

| Paket | Görev |
|---|---|
| `@entegreflow/config` | Ortak tsconfig / eslint / prettier / vitest |
| `@entegreflow/tokens` | OKLCH tasarım tokenları (light/dark/density) — platform-nötr |
| `@entegreflow/icons` | KKD/ürün ikonları + lucide |
| `@entegreflow/ui` | React bileşen kütüphanesi |
| `@entegreflow/contracts` | Zod şemaları + tipler (tek doğruluk kaynağı) |
| `@entegreflow/api-client` | Tipli tRPC client (platform-nötr) |
| `@entegreflow/i18n` | tr/en katalogları + Intl yardımcıları |
| `@entegreflow/db` | Drizzle şema + RLS + TenantAwareDb |
| `@entegreflow/core` | Crypto (envelope) · tenant-context · logger · egress-guard · sanitizer |
| `@entegreflow/erp` · `mail` · `ai` · `jobs` | Entegrasyon adapterleri + kuyruk |

## Geliştirme

```bash
pnpm install
pnpm dev:up          # postgres + redis + minio + mailpit (docker)
pnpm db:migrate
pnpm db:seed
pnpm dev             # tüm uygulamalar
```

### Doğrulama

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm firewall        # cross-platform import sınırları
```

## Güvenlik ilkeleri (özet)

- Her tenant tablosunda `FORCE ROW LEVEL SECURITY`; tüm DB erişimi `TenantAwareDb` üzerinden.
- Sırlar envelope encryption (AES-256-GCM) ile şifreli; KEK yalnız api+worker env'inde.
- JWT access + dönen refresh (family reuse-detection); hassas aksiyonlarda DB'den rol re-check.
- SSRF egress-guard, prompt-injection savunması, append-only audit log.

Prototip referansı `./mail crm` altında durur (workspace dışı).
