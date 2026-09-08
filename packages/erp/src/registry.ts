import type { ErpAdapter } from "./ports";

/** Builds an adapter instance from a (non-secret) config + resolved secrets. */
export interface ErpAdapterFactory {
  id: string;
  create(config: Record<string, unknown>, secrets?: Record<string, string>): ErpAdapter;
}

/**
 * Per-tenant adapter resolution. The api/worker register the known factories
 * once at boot; `create` is called with the tenant's integration config.
 */
export class ErpAdapterRegistry {
  private readonly factories = new Map<string, ErpAdapterFactory>();

  register(factory: ErpAdapterFactory): this {
    this.factories.set(factory.id, factory);
    return this;
  }

  has(adapterId: string): boolean {
    return this.factories.has(adapterId);
  }

  create(
    adapterId: string,
    config: Record<string, unknown> = {},
    secrets?: Record<string, string>,
  ): ErpAdapter {
    const factory = this.factories.get(adapterId);
    if (!factory) {
      throw new Error(`Bilinmeyen ERP adapteri: "${adapterId}"`);
    }
    return factory.create(config, secrets);
  }

  list(): string[] {
    return [...this.factories.keys()];
  }
}
