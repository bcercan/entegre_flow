import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { TenantContext } from "@entegreflow/core";

export type RequestWithTenant = Request & { tenant?: TenantContext };

/** Injects the request's tenant context (populated by JwtAuthGuard). */
export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<RequestWithTenant>();
    if (!req.tenant) throw new Error("Tenant bağlamı yok — JwtAuthGuard uygulanmamış");
    return req.tenant;
  },
);
