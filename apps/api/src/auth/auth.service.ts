import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { schema, type DbClients } from "@entegreflow/db";
import { Unauthenticated, Forbidden, verifyPassword } from "@entegreflow/core";
import type { SessionUser } from "@entegreflow/contracts";
import { DB_CLIENTS } from "@entegreflow/server";
import { JwtService } from "./jwt.service";

/**
 * Login uses the SYSTEM (owner) connection: users/memberships are not
 * tenant-RLS-readable by the app role (design: auth uses the elevated role).
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CLIENTS) private readonly db: DbClients,
    private readonly jwt: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: SessionUser }> {
    const [user] = await this.db.system
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);
    if (!user) throw Unauthenticated("E-posta veya parola hatalı");

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw Unauthenticated("E-posta veya parola hatalı");

    const [membership] = await this.db.system
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, user.id), eq(schema.memberships.status, "active")))
      .limit(1);
    if (!membership) throw Forbidden("Aktif üyelik yok");

    const sid = randomUUID();
    const accessToken = await this.jwt.signAccess({
      sub: user.id,
      tid: membership.tenantId,
      role: membership.role,
      sid,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        tenantId: membership.tenantId,
        role: membership.role,
      },
    };
  }
}
