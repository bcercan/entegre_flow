import { randomUUID } from "node:crypto";
import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import type { RequestWithTenant } from "./tenant.decorator";

/** Verifies the Bearer access token and attaches the tenant context to the request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithTenant>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token gerekli");
    }
    try {
      const claims = await this.jwt.verifyAccess(header.slice(7));
      req.tenant = {
        tenantId: claims.tid,
        userId: claims.sub,
        role: claims.role,
        requestId: (req.headers["x-request-id"] as string) ?? randomUUID(),
      };
      return true;
    } catch {
      throw new UnauthorizedException("Geçersiz veya süresi dolmuş token");
    }
  }
}
