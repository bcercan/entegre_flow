import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { schema, type TenantAwareDb } from "@entegreflow/db";
import { NotFound, type TenantContext } from "@entegreflow/core";
import { TENANT_DB } from "@entegreflow/server";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantCtx } from "../auth/tenant.decorator";
import { AnalysisService } from "./analysis.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    private readonly analysis: AnalysisService,
  ) {}

  /** Inbox threads for the current tenant (RLS-scoped). */
  @Get("threads")
  threads(@TenantCtx() ctx: TenantContext) {
    return this.tdb.withTenant(ctx, (tx) =>
      tx
        .select()
        .from(schema.emailThreads)
        .orderBy(desc(schema.emailThreads.lastMessageAt)),
    );
  }

  /** Flattened inbox rows (latest inbound message per thread + customer name). */
  @Get("inbox")
  inbox(@TenantCtx() ctx: TenantContext) {
    return this.tdb.withTenant(ctx, (tx) =>
      tx
        .select({
          id: schema.emailMessages.id,
          threadId: schema.emailMessages.threadId,
          from: schema.emailMessages.from,
          subject: schema.emailMessages.subject,
          snippet: schema.emailMessages.snippet,
          receivedAt: schema.emailMessages.receivedAt,
          aiStatus: schema.emailMessages.aiStatus,
          isRead: schema.emailMessages.isRead,
          company: schema.customers.name,
        })
        .from(schema.emailMessages)
        .innerJoin(
          schema.emailThreads,
          eq(schema.emailThreads.id, schema.emailMessages.threadId),
        )
        .leftJoin(schema.customers, eq(schema.customers.id, schema.emailThreads.customerId))
        .where(
          and(
            eq(schema.emailMessages.direction, "inbound"),
            eq(schema.emailThreads.status, "inbox"),
          ),
        )
        .orderBy(desc(schema.emailMessages.receivedAt)),
    );
  }

  @Get("messages/:id")
  async message(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select().from(schema.emailMessages).where(eq(schema.emailMessages.id, id)).limit(1),
    );
    if (!row) throw NotFound("İleti bulunamadı");
    return row;
  }

  /** Run (or re-run) the AI analysis for a message and persist it. */
  @Post("messages/:id/analyze")
  analyze(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    return this.analysis.analyze(id, ctx);
  }
}
