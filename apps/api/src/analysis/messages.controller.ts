import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { schema, type TenantAwareDb } from "@entegreflow/db";
import { NotFound, type TenantContext } from "@entegreflow/core";

const THREAD_STATUSES = ["inbox", "answered", "other", "deleted", "draft"] as const;
type ThreadStatus = (typeof THREAD_STATUSES)[number];
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

  /** Flattened mailbox rows. `box=sent` lists outbound messages (Sent);
   * otherwise inbound messages scoped to a folder via thread status. */
  @Get("inbox")
  async inbox(
    @TenantCtx() ctx: TenantContext,
    @Query("status") status?: string,
    @Query("box") box?: string,
  ) {
    const base = {
      id: schema.emailMessages.id,
      threadId: schema.emailMessages.threadId,
      from: schema.emailMessages.from,
      to: schema.emailMessages.to,
      subject: schema.emailMessages.subject,
      snippet: schema.emailMessages.snippet,
      receivedAt: schema.emailMessages.receivedAt,
      aiStatus: schema.emailMessages.aiStatus,
      isRead: schema.emailMessages.isRead,
      isFlagged: schema.emailMessages.isFlagged,
      company: schema.customers.name,
      threadStatus: schema.emailThreads.status,
    };
    const rows = await this.tdb.withTenant(ctx, (tx) => {
      const q = tx
        .select(base)
        .from(schema.emailMessages)
        .innerJoin(schema.emailThreads, eq(schema.emailThreads.id, schema.emailMessages.threadId))
        .leftJoin(schema.customers, eq(schema.customers.id, schema.emailThreads.customerId));
      if (box === "sent") {
        return q
          .where(
            and(
              eq(schema.emailMessages.direction, "outbound"),
              ne(schema.emailThreads.status, "deleted"),
              ne(schema.emailThreads.status, "draft"),
            ),
          )
          .orderBy(desc(schema.emailMessages.receivedAt));
      }
      if (box === "drafts") {
        return q
          .where(
            and(
              eq(schema.emailMessages.direction, "outbound"),
              eq(schema.emailThreads.status, "draft"),
            ),
          )
          .orderBy(desc(schema.emailMessages.receivedAt));
      }
      const folder: ThreadStatus =
        status && (THREAD_STATUSES as readonly string[]).includes(status)
          ? (status as ThreadStatus)
          : "inbox";
      return q
        .where(
          and(
            eq(schema.emailMessages.direction, "inbound"),
            eq(schema.emailThreads.status, folder),
          ),
        )
        .orderBy(desc(schema.emailMessages.receivedAt));
    });
    // For the Sent box show the recipient (to[0]) in place of the sender.
    const showRecipient = box === "sent" || box === "drafts";
    return rows.map(({ to, ...r }) => ({
      ...r,
      from: showRecipient ? (to?.[0] ?? r.from) : r.from,
    }));
  }

  /** Mark a message read / unread. */
  @Patch("messages/:id/read")
  async setRead(
    @TenantCtx() ctx: TenantContext,
    @Param("id") id: string,
    @Body("isRead") isRead: boolean,
  ) {
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx
        .update(schema.emailMessages)
        .set({ isRead: Boolean(isRead), updatedAt: new Date() })
        .where(eq(schema.emailMessages.id, id))
        .returning({ id: schema.emailMessages.id, isRead: schema.emailMessages.isRead }),
    );
    if (!row) throw NotFound("İleti bulunamadı");
    return row;
  }

  /** Flag / unflag a message. */
  @Patch("messages/:id/flag")
  async setFlag(
    @TenantCtx() ctx: TenantContext,
    @Param("id") id: string,
    @Body("isFlagged") isFlagged: boolean,
  ) {
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx
        .update(schema.emailMessages)
        .set({ isFlagged: Boolean(isFlagged), updatedAt: new Date() })
        .where(eq(schema.emailMessages.id, id))
        .returning({ id: schema.emailMessages.id, isFlagged: schema.emailMessages.isFlagged }),
    );
    if (!row) throw NotFound("İleti bulunamadı");
    return row;
  }

  /** Global search over non-deleted messages (subject / snippet / sender / customer). */
  @Get("search")
  search(@TenantCtx() ctx: TenantContext, @Query("q") q?: string) {
    const term = (q ?? "").trim();
    if (!term) return Promise.resolve([]);
    const like = `%${term}%`;
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
          isFlagged: schema.emailMessages.isFlagged,
          company: schema.customers.name,
          threadStatus: schema.emailThreads.status,
        })
        .from(schema.emailMessages)
        .innerJoin(schema.emailThreads, eq(schema.emailThreads.id, schema.emailMessages.threadId))
        .leftJoin(schema.customers, eq(schema.customers.id, schema.emailThreads.customerId))
        .where(
          and(
            ne(schema.emailThreads.status, "deleted"),
            or(
              ilike(schema.emailMessages.subject, like),
              ilike(schema.emailMessages.snippet, like),
              ilike(schema.customers.name, like),
              sql`${schema.emailMessages.from}->>'name' ilike ${like}`,
              sql`${schema.emailMessages.from}->>'address' ilike ${like}`,
            ),
          ),
        )
        .orderBy(desc(schema.emailMessages.receivedAt))
        .limit(50),
    );
  }

  /** Empty the Trash — permanently delete every "deleted" thread + its rows.
   * No FK constraints exist; orphaned quote/analysis rows are invisible. */
  @Delete("trash")
  async emptyTrash(@TenantCtx() ctx: TenantContext) {
    return this.tdb.withTenant(ctx, async (tx) => {
      const threads = await tx
        .select({ id: schema.emailThreads.id })
        .from(schema.emailThreads)
        .where(eq(schema.emailThreads.status, "deleted"));
      const tids = threads.map((t) => t.id);
      if (!tids.length) return { removed: 0 };
      const msgs = await tx
        .select({ id: schema.emailMessages.id })
        .from(schema.emailMessages)
        .where(inArray(schema.emailMessages.threadId, tids));
      const mids = msgs.map((m) => m.id);
      if (mids.length) {
        await tx.delete(schema.attachments).where(inArray(schema.attachments.messageId, mids));
      }
      await tx.delete(schema.emailMessages).where(inArray(schema.emailMessages.threadId, tids));
      await tx.delete(schema.emailThreads).where(inArray(schema.emailThreads.id, tids));
      return { removed: tids.length };
    });
  }

  /** Permanently delete one thread and its messages + attachment records. */
  @Delete("threads/:id")
  async deleteThread(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    const removed = await this.tdb.withTenant(ctx, async (tx) => {
      const [row] = await tx
        .select({ id: schema.emailThreads.id })
        .from(schema.emailThreads)
        .where(eq(schema.emailThreads.id, id))
        .limit(1);
      if (!row) return false;
      const msgs = await tx
        .select({ id: schema.emailMessages.id })
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.threadId, id));
      const mids = msgs.map((m) => m.id);
      if (mids.length) {
        await tx.delete(schema.attachments).where(inArray(schema.attachments.messageId, mids));
      }
      await tx.delete(schema.emailMessages).where(eq(schema.emailMessages.threadId, id));
      await tx.delete(schema.emailThreads).where(eq(schema.emailThreads.id, id));
      return true;
    });
    if (!removed) throw NotFound("Konu bulunamadı");
    return { ok: true };
  }

  /** Move a thread to a folder (inbox / answered / other = archive). */
  @Patch("threads/:id/status")
  async setThreadStatus(
    @TenantCtx() ctx: TenantContext,
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    if (!(THREAD_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException("Geçersiz klasör durumu");
    }
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx
        .update(schema.emailThreads)
        .set({ status: status as ThreadStatus, updatedAt: new Date() })
        .where(eq(schema.emailThreads.id, id))
        .returning({ id: schema.emailThreads.id, status: schema.emailThreads.status }),
    );
    if (!row) throw NotFound("Konu bulunamadı");
    return row;
  }

  @Get("messages/:id")
  async message(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select().from(schema.emailMessages).where(eq(schema.emailMessages.id, id)).limit(1),
    );
    if (!row) throw NotFound("İleti bulunamadı");
    return row;
  }

  /** All messages in the same thread as :id, oldest → newest (conversation view). */
  @Get("messages/:id/thread")
  async thread(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    const [row] = await this.tdb.withTenant(ctx, (tx) =>
      tx
        .select({ threadId: schema.emailMessages.threadId })
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.id, id))
        .limit(1),
    );
    if (!row) throw NotFound("İleti bulunamadı");
    return this.tdb.withTenant(ctx, (tx) =>
      tx
        .select({
          id: schema.emailMessages.id,
          direction: schema.emailMessages.direction,
          from: schema.emailMessages.from,
          to: schema.emailMessages.to,
          subject: schema.emailMessages.subject,
          bodyText: schema.emailMessages.bodyText,
          receivedAt: schema.emailMessages.receivedAt,
        })
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.threadId, row.threadId))
        .orderBy(schema.emailMessages.receivedAt),
    );
  }

  /** Run (or re-run) the AI analysis for a message and persist it. */
  @Post("messages/:id/analyze")
  analyze(@TenantCtx() ctx: TenantContext, @Param("id") id: string) {
    return this.analysis.analyze(id, ctx);
  }
}
