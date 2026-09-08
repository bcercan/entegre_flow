import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDbClients, TenantAwareDb, type DbClients } from "@entegreflow/db";
import { APP_CONFIG, type AppConfig } from "../config/env";

/** DI tokens for DB access. */
export const DB_CLIENTS = Symbol("DB_CLIENTS");
/** TenantAwareDb — the ONLY sanctioned path to tenant data. */
export const TENANT_DB = Symbol("TENANT_DB");

@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENTS,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig): DbClients =>
        createDbClients({ url: cfg.DATABASE_URL, systemUrl: cfg.DATABASE_MIGRATION_URL }),
    },
    {
      provide: TENANT_DB,
      inject: [DB_CLIENTS],
      useFactory: (clients: DbClients) => new TenantAwareDb(clients.runtime),
    },
  ],
  exports: [DB_CLIENTS, TENANT_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DB_CLIENTS) private readonly clients: DbClients) {}

  async onModuleDestroy(): Promise<void> {
    await this.clients.close();
  }
}
