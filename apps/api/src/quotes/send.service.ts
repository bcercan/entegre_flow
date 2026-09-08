import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { schema, TenantAwareDb } from "@entegreflow/db";
import { Conflict, NotFound, type TenantContext } from "@entegreflow/core";
import { buildQuoteEmail, type MailboxProvider } from "@entegreflow/mail";
import type { AnalysisLine, Currency, Quote, QuoteLine } from "@entegreflow/contracts";
import { APP_CONFIG, type AppConfig } from "@entegreflow/server";
import { TENANT_DB } from "@entegreflow/server";
import { MAILBOX } from "./mail.tokens";

type QuoteRow = typeof schema.quotes.$inferSelect;

function billableLines(lines: AnalysisLine[]): QuoteLine[] {
  return lines
    .filter((l) => l.matchedSku && l.qty > 0 && l.deal)
    .map((l) => ({
      sku: l.matchedSku!,
      name: l.name,
      qty: l.qty,
      unit: l.unit,
      unitPrice: l.deal!,
      lineTotal: { amountMinor: l.qty * l.deal!.amountMinor, currency: l.deal!.currency },
    }));
}

function toQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    number: row.number,
    draftId: row.draftId,
    customerId: row.customerId,
    lines: row.lines,
    totals: { net: { amountMinor: row.netMinor, currency: row.currency as Currency }, currency: row.currency as Currency },
    validUntil: row.validUntil.toISOString(),
    status: row.status,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    providerMessageId: row.providerMessageId,
  };
}

/**
 * HITL send: freeze a Quote from the analysis, guard against double-quote/
 * double-send, send the reply in-thread via SMTP, then mark the thread answered.
 */
@Injectable()
export class SendService {
  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    @Inject(MAILBOX) private readonly mailbox: MailboxProvider,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async send(messageId: string, ctx: TenantContext): Promise<Quote> {
    const loaded = await this.tdb.withTenant(ctx, async (tx) => {
      const [msg] = await tx
        .select()
        .from(schema.emailMessages)
        .where(eq(schema.emailMessages.id, messageId))
        .limit(1);
      if (!msg) return null;
      const [analysis] = await tx
        .select()
        .from(schema.messageAnalyses)
        .where(eq(schema.messageAnalyses.messageId, messageId))
        .limit(1);
      const [existing] = await tx
        .select()
        .from(schema.quotes)
        .where(
          and(
            eq(schema.quotes.threadId, msg.threadId),
            inArray(schema.quotes.status, ["queued", "sent"]),
          ),
        )
        .limit(1);
      return { msg, analysis: analysis ?? null, existing: existing ?? null };
    });

    if (!loaded) throw NotFound("İleti bulunamadı");
    // Idempotent: an active quote already exists for this thread → don't re-send.
    if (loaded.existing) return toQuote(loaded.existing);
    if (!loaded.analysis) throw Conflict("Önce analiz çalıştırılmalı");

    const lines = billableLines(loaded.analysis.lines);
    if (lines.length === 0) throw Conflict("Faturalanabilir kalem yok");
    const currency = lines[0]!.unitPrice.currency;
    const netMinor = lines.reduce((s, l) => s + l.lineTotal.amountMinor, 0);
    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 86_400_000);

    // Freeze draft + immutable quote (queued). The partial unique index on
    // (thread WHERE status IN queued|sent) makes a racing double-quote fail.
    const created = await this.tdb.withTenant(ctx, async (tx) => {
      const counted = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.quotes);
      const seq = (counted[0]?.n ?? 0) + 1;
      const number = `TKF-${now.getFullYear()}-${String(seq).padStart(4, "0")}`;

      const [draft] = await tx
        .insert(schema.quoteDrafts)
        .values({
          tenantId: ctx.tenantId,
          messageId,
          threadId: loaded.msg.threadId,
          customerId: loaded.existing?.customerId ?? null,
          bodyText: loaded.analysis!.draftText,
          lines,
          netMinor,
          currency,
          version: 1,
          status: "approved",
          createdBy: ctx.userId,
        })
        .returning();

      const [quote] = await tx
        .insert(schema.quotes)
        .values({
          tenantId: ctx.tenantId,
          draftId: draft!.id,
          threadId: loaded.msg.threadId,
          number,
          customerId: draft!.customerId,
          lines,
          netMinor,
          currency,
          validUntil,
          status: "queued",
          approvedBy: ctx.userId,
        })
        .returning();

      await tx.insert(schema.sentReplies).values({
        tenantId: ctx.tenantId,
        quoteId: quote!.id,
        status: "queued",
        idempotencyKey: quote!.id,
      });
      return quote!;
    });

    // Build + send in-thread (network — outside the transaction).
    const { text, html } = buildQuoteEmail(loaded.analysis.draftText, lines, netMinor, currency);
    const subject = loaded.msg.subject.startsWith("Re:")
      ? loaded.msg.subject
      : `Re: ${loaded.msg.subject}`;
    const { providerMessageId } = await this.mailbox.send({
      from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
      to: [{ name: loaded.msg.from.name, address: loaded.msg.from.address }],
      subject,
      text,
      html,
      inReplyTo: loaded.msg.messageId,
      references: [loaded.msg.messageId],
      idempotencyKey: created.id,
    });

    // Mark sent + record the outbound message + answer the thread.
    const sent = await this.tdb.withTenant(ctx, async (tx) => {
      const [q] = await tx
        .update(schema.quotes)
        .set({ status: "sent", providerMessageId, sentAt: now })
        .where(eq(schema.quotes.id, created.id))
        .returning();
      await tx
        .update(schema.sentReplies)
        .set({ status: "sent", providerMessageId })
        .where(eq(schema.sentReplies.quoteId, created.id));
      await tx
        .update(schema.emailThreads)
        .set({ status: "answered" })
        .where(eq(schema.emailThreads.id, loaded.msg.threadId));
      await tx
        .update(schema.emailMessages)
        .set({ aiStatus: "answered" })
        .where(eq(schema.emailMessages.id, messageId));
      await tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId: loaded.msg.threadId,
          accountId: loaded.msg.accountId,
          direction: "outbound",
          messageId: providerMessageId,
          inReplyTo: loaded.msg.messageId,
          from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
          to: [{ name: loaded.msg.from.name, address: loaded.msg.from.address }],
          subject,
          snippet: "Teklif gönderildi",
          bodyText: text,
          receivedAt: now,
          isRead: true,
          aiStatus: "answered",
        })
        .onConflictDoNothing();
      return q!;
    });

    return toQuote(sent);
  }
}
