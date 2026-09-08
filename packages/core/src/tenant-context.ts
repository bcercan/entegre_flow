import { AsyncLocalStorage } from "node:async_hooks";
import type { Role } from "@entegreflow/contracts";
import { TenantContextMissing } from "./errors";

/**
 * Ambient request/job context. Propagated via AsyncLocalStorage so every DB
 * access (through TenantAwareDb) can set the RLS session variable without
 * threading the tenant id through every call site.
 */
export interface TenantContext {
  tenantId: string;
  userId: string | null;
  role: Role | null;
  requestId: string;
}

const als = new AsyncLocalStorage<TenantContext>();

/** Run `fn` with the given tenant context bound for its async lifetime. */
export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Get the current context, or undefined if none is bound. */
export function getTenantContext(): TenantContext | undefined {
  return als.getStore();
}

/** Get the current context or throw — use where a tenant is mandatory. */
export function requireTenantContext(): TenantContext {
  const ctx = als.getStore();
  if (!ctx) throw TenantContextMissing();
  return ctx;
}
