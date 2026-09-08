import { Inject, Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { accessClaimsSchema, type AccessClaims } from "@entegreflow/contracts";

/** HS256 access-token sign/verify via jose (pure JS). Refresh rotation: Phase 1b. */
@Injectable()
export class JwtService {
  constructor(@Inject(APP_CONFIG) private readonly cfg: AppConfig) {}

  private secret(): Uint8Array {
    if (!this.cfg.JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET tanımlı değil (auth kullanılamaz).");
    }
    return new TextEncoder().encode(this.cfg.JWT_ACCESS_SECRET);
  }

  async signAccess(claims: AccessClaims): Promise<string> {
    return new SignJWT({ tid: claims.tid, role: claims.role, sid: claims.sid })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.sub)
      .setIssuer(this.cfg.JWT_ISSUER)
      .setAudience(this.cfg.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.cfg.JWT_ACCESS_TTL}s`)
      .sign(this.secret());
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.secret(), {
      issuer: this.cfg.JWT_ISSUER,
      audience: this.cfg.JWT_AUDIENCE,
    });
    return accessClaimsSchema.parse({
      sub: payload.sub,
      tid: payload.tid,
      role: payload.role,
      sid: payload.sid,
    });
  }
}
