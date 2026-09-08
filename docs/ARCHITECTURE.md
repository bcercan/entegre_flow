# EntegreFlow — Mimari

AI Satış & Teklif Asistanı: gelen RFQ e-postalarını Claude ile analiz edip ERP'den (stok/fiyat/cari) zenginleştirilmiş teklif taslakları üreten, çok kiracılı (multi-tenant) TypeScript SaaS.

## Sistem diyagramı

```
Tarayıcı (temsilci)
   │ HTTPS / JWT, SSE (ticket)
   ▼
┌──────────┐        ┌────────────┐  BullMQ  ┌────────────────┐
│ Next.js  │◀──────▶│  api (Nest)│◀────────▶│  worker (Nest) │
│  web     │ trpc   │ trpc+REST  │  (Redis) │  processors    │
└──────────┘        └─────┬──────┘          └───────┬────────┘
                          │  SET LOCAL app.tenant_id (RLS)     │
                     ┌────▼─────────────────────────▼────┐
                     │   PostgreSQL (RLS-enforced)         │
                     └─────────────────────────────────────┘
                     ┌──────────┐   ┌──────────────────┐
                     │  Redis   │   │  MinIO / S3      │
                     └──────────┘   └──────────────────┘
   dış: IMAP/SMTP (mailbox) · ERP (mock→Dia→Logo/Netsis) · Claude API
        — hepsi per-tenant adapter portları + envelope-şifreli kimlik bilgileri
```

## Kesin teknoloji kararları

| Alan | Karar |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, Node 22 |
| Backend | NestJS (api: HTTP; worker: BullMQ) |
| Web | Next.js 15 App Router (standalone output) |
| ORM | Drizzle (açık tx → RLS `SET LOCAL` denetlenebilir) |
| Çok kiracılık | Tek DB + `tenant_id` + Postgres RLS (`FORCE`, fail-closed sentinel) |
| Sırlar | Envelope encryption (AES-256-GCM DEK, KEK env→KMS, AAD=tenant\|integration) |
| Kuyruk | BullMQ + Redis |
| Stil | Tailwind v4 + OKLCH token köprüsü (`@entegreflow/tokens`) |
| AI | Anthropic Claude, `LlmProvider` portu (P1) |
| Paket dağıtımı | tsup dual ESM+CJS (backend CJS, web ESM tüketir) |

## Paket sınırları (firewall — CI'da zorunlu)

`@entegreflow/{contracts,tokens,api-client,ui,icons,i18n}` platform-nötr: Nest/Node/DOM-only import **edemez**. `apps/web`, backend paketlerini (`db/core/erp/mail/ai/jobs`) import **edemez**. `pnpm firewall` (dependency-cruiser) bunu build kapısı olarak uygular — Tauri/RN'i sonradan ucuz yapan kural budur.

## Güvenlik modeli (uygulanan)

- **Kiracı izolasyonu**: her tenant tablosunda `ENABLE`+`FORCE ROW LEVEL SECURITY` + `tenant_id = current_setting('app.tenant_id')::uuid` policy (strict). Tüm erişim `TenantAwareDb.withTenant()` üzerinden (tx aç → `set_config(...local)` → çalıştır). Runtime rolü NOBYPASSRLS + imkânsız-tenant sentinel varsayılan → **fail-closed**. Owner rolü BYPASSRLS (yalnız migrate/seed/auth).
- **Tenant tablo listesi** `packages/db/src/rls.ts` `TENANT_SCOPED_TABLES` = tek doğruluk kaynağı; bir tablo eksik FORCE/policy ile gelirse **CI testi düşer**.
- **Cross-tenant probe** (`packages/db/src/rls.test.ts`): A token'ı B'nin 0 satırını görür; bağlam yokken 0 satır; WITH CHECK başka kiracıya yazmayı reddeder.
- **Sırlar**: `EnvelopeCrypto` (KEK yalnız api+worker env'inde). **SSRF**: `resolveSafeHost`/`assertSafeHttpUrl` private/loopback/metadata IP reddeder, çözümlenen IP'yi pinler. **Sanitizer**: inbound render + outbound AI taslağı (gönderim öncesi) tek noktadan temizlenir.

## Adapter portları (Phase 1+)

- **ERP** (`packages/erp`): `ErpAdapter` (CustomerProvider/StockProvider/PriceProvider/OrderProvider yeteneklere ayrılmış) + per-tenant registry. P0: yapı; P1: `MockErpAdapter` (seed `data.jsx`); P2: `DiaErpAdapter`.
- **Mailbox** (`packages/mail`): `MailboxProvider` (IMAP fetch + SMTP send), cursor+watch; Graph/Gmail sonra.
- **AI** (`packages/ai`): `LlmProvider` (Anthropic), tool-use ile zorunlu `AiAnalysis` zod şeması; `matchedSku` sunucu aday kümesine hard-validate; stok/fiyat/risk **sunucudan**, modelden değil.

## Coolify dağıtımı

- **api + web** = ayrı Coolify *Application* (Dockerfile.api / Dockerfile.web) → rolling + health gate (`/readyz`, `/api/health`). Traefik/TLS Coolify UI'da (repo'da label yok).
- **Postgres + Redis** = Coolify *managed resource* (yedek + UI restore).
- **worker + minio** = `docker-compose.yml` (yalnız iç ağ).
- **Migration** = Coolify pre-deploy hook: `pnpm --filter @entegreflow/db migrate` (advisory-lock, forward-only).
- İlk kurulumda Postgres rolleri: `infra/postgres/init.sql` eşdeğeri elle çalıştırılır.

## Yol haritası

- **Phase 0 (tamam)**: monorepo, paketler, Drizzle+RLS+probe, NestJS api/worker (health), Next.js web (tokens), Docker, CI, dev compose.
- **Phase 1 (online MVP)**: Auth (JWT+refresh/Argon2id), envelope cred yönetimi, `ImapSmtpProvider` (cold-start/dedupe/threading/triage), `MockErpAdapter`+cache, `AnthropicProvider` (tek yapısal çağrı + `AiCostGuard`), taslak→HITL onay→SMTP gönderim (idempotency), `@entegreflow/ui` 3-pane inbox.
- **Phase 2**: gerçek Dia adapter, pgvector eşleştirme, outbox, OTel, KEK/JWT rotasyon, tenant onboarding/davet, OrdersModule.
- **Phase 3**: Tauri (masaüstü) → Expo/RN (mobil).

## Doğrulama

```bash
pnpm typecheck && pnpm lint && pnpm firewall && pnpm build && pnpm test
pnpm dev:up && pnpm db:migrate && pnpm db:seed   # canlı RLS probe + api /readyz
```
