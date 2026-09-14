import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { schema, TenantAwareDb } from "@entegreflow/db";
import { NotFound, ValidationError, type TenantContext } from "@entegreflow/core";
import type { MailboxProvider } from "@entegreflow/mail";
import { APP_CONFIG, type AppConfig, TENANT_DB } from "@entegreflow/server";
import { MAILBOX } from "./mail.tokens";
import { StorageService } from "../attachments/storage.service";

export interface ComposeAttachment {
  storageKey: string;
  filename: string;
  mime: string;
  size: number;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function textToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div>${esc.replace(/\n/g, "<br>")}</div>`;
}

/**
 * Plain in-thread reply / forward for a received message. Reuses the SMTP
 * mailbox port, records the outbound message, and (for replies) answers the
 * thread — mirroring the quote-send flow without freezing a Quote.
 */
@Injectable()
export class ComposeService {
  constructor(
    @Inject(TENANT_DB) private readonly tdb: TenantAwareDb,
    @Inject(MAILBOX) private readonly mailbox: MailboxProvider,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly storage: StorageService,
  ) {}

  private async loadMessage(messageId: string, ctx: TenantContext) {
    const [msg] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select().from(schema.emailMessages).where(eq(schema.emailMessages.id, messageId)).limit(1),
    );
    if (!msg) throw NotFound("İleti bulunamadı");
    return msg;
  }

  async reply(messageId: string, text: string, ctx: TenantContext, html?: string) {
    const body = (text ?? "").trim();
    if (!body) throw ValidationError("Yanıt metni boş olamaz");
    const bodyHtml = html && html.trim() ? html : textToHtml(body);
    const msg = await this.loadMessage(messageId, ctx);
    const subject = msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
    const now = new Date();

    const { providerMessageId } = await this.mailbox.send({
      from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
      to: [{ name: msg.from.name, address: msg.from.address }],
      subject,
      text: body,
      html: bodyHtml,
      inReplyTo: msg.messageId,
      references: [msg.messageId],
    });

    await this.tdb.withTenant(ctx, async (tx) => {
      await tx
        .update(schema.emailThreads)
        .set({ status: "answered", updatedAt: now })
        .where(eq(schema.emailThreads.id, msg.threadId));
      await tx
        .update(schema.emailMessages)
        .set({ aiStatus: "answered", updatedAt: now })
        .where(eq(schema.emailMessages.id, messageId));
      await tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId: msg.threadId,
          accountId: msg.accountId,
          direction: "outbound",
          messageId: providerMessageId,
          inReplyTo: msg.messageId,
          from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
          to: [{ name: msg.from.name, address: msg.from.address }],
          subject,
          snippet: body.slice(0, 140),
          bodyText: body,
          bodyHtml,
          receivedAt: now,
          isRead: true,
          aiStatus: "answered",
        })
        .onConflictDoNothing();
    });

    return { ok: true, providerMessageId };
  }

  async composeNew(
    to: string,
    subject: string,
    text: string,
    ctx: TenantContext,
    html?: string,
    cc?: string,
    bcc?: string,
    attachments: ComposeAttachment[] = [],
  ) {
    const recipient = (to ?? "").trim();
    if (!EMAIL_RE.test(recipient)) throw ValidationError("Geçerli bir alıcı e-postası girin");
    const parseList = (s?: string) =>
      (s ?? "")
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter((x) => EMAIL_RE.test(x))
        .map((address) => ({ address }));
    const ccList = parseList(cc);
    const bccList = parseList(bcc);
    const subj = (subject ?? "").trim() || "(konu yok)";
    const body = (text ?? "").trim();
    if (!body) throw ValidationError("İleti metni boş olamaz");
    const bodyHtml = html && html.trim() ? html : textToHtml(body);

    // Need a mailbox (accountId) to hang the new thread + outbound message on.
    const [account] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select({ id: schema.emailAccounts.id }).from(schema.emailAccounts).limit(1),
    );
    if (!account) throw ValidationError("Bağlı bir posta hesabı yok");

    // Pull staged attachment bytes back for the SMTP send.
    const mailAtts = await Promise.all(
      attachments.map(async (a) => ({
        filename: a.filename,
        content: await this.storage.getObject(a.storageKey),
        contentType: a.mime,
      })),
    );

    const now = new Date();
    const { providerMessageId } = await this.mailbox.send({
      from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
      to: [{ address: recipient }],
      cc: ccList,
      bcc: bccList,
      subject: subj,
      text: body,
      html: bodyHtml,
      attachments: mailAtts.length ? mailAtts : undefined,
    });

    const threadId = await this.tdb.withTenant(ctx, async (tx) => {
      const [thread] = await tx
        .insert(schema.emailThreads)
        .values({
          tenantId: ctx.tenantId,
          accountId: account.id,
          subject: subj,
          status: "answered", // outgoing → lives in the Sent box
          lastMessageAt: now,
          messageCount: 1,
        })
        .returning({ id: schema.emailThreads.id });
      const [outMsg] = await tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId: thread!.id,
          accountId: account.id,
          direction: "outbound",
          messageId: providerMessageId,
          from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
          to: [{ name: null, address: recipient }],
          subject: subj,
          snippet: body.slice(0, 140),
          bodyText: body,
          bodyHtml,
          receivedAt: now,
          isRead: true,
          aiStatus: "none",
        })
        .returning({ id: schema.emailMessages.id });
      if (attachments.length) {
        await tx.insert(schema.attachments).values(
          attachments.map((a) => ({
            tenantId: ctx.tenantId,
            messageId: outMsg!.id,
            filenameDisplay: a.filename,
            storageKey: a.storageKey,
            mime: a.mime,
            sizeBytes: a.size,
            scanned: true,
          })),
        );
      }
      return thread!.id;
    });

    return { ok: true, providerMessageId, threadId };
  }

  /** Save a compose as a draft (no SMTP send). Lands in the Drafts box. */
  async saveDraft(
    to: string,
    subject: string,
    text: string,
    ctx: TenantContext,
    html?: string,
    cc?: string,
    bcc?: string,
  ) {
    const recipient = (to ?? "").trim();
    const subj = (subject ?? "").trim() || "(konu yok)";
    const body = (text ?? "").trim();
    const bodyHtml = html && html.trim() ? html : textToHtml(body);
    const ccBcc = [cc, bcc].filter((s) => s && s.trim()).join(", ");
    const [account] = await this.tdb.withTenant(ctx, (tx) =>
      tx.select({ id: schema.emailAccounts.id }).from(schema.emailAccounts).limit(1),
    );
    if (!account) throw ValidationError("Bağlı bir posta hesabı yok");
    const now = new Date();
    const result = await this.tdb.withTenant(ctx, async (tx) => {
      const [thread] = await tx
        .insert(schema.emailThreads)
        .values({
          tenantId: ctx.tenantId,
          accountId: account.id,
          subject: subj,
          status: "draft",
          lastMessageAt: now,
          messageCount: 1,
        })
        .returning({ id: schema.emailThreads.id });
      const [msg] = await tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId: thread!.id,
          accountId: account.id,
          direction: "outbound",
          messageId: `draft-${randomUUID()}`,
          from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
          to: recipient ? [{ name: null, address: recipient }] : [],
          subject: subj,
          snippet: ccBcc ? `${body.slice(0, 120)} · ${ccBcc}` : body.slice(0, 140),
          bodyText: body,
          bodyHtml,
          receivedAt: now,
          isRead: true,
          aiStatus: "none",
        })
        .returning({ id: schema.emailMessages.id });
      return { threadId: thread!.id, messageId: msg!.id };
    });
    return { ok: true, ...result };
  }

  async forward(messageId: string, to: string, text: string, ctx: TenantContext) {
    const recipient = (to ?? "").trim();
    if (!EMAIL_RE.test(recipient)) throw ValidationError("Geçerli bir alıcı e-postası girin");
    const msg = await this.loadMessage(messageId, ctx);
    const subject = msg.subject.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`;
    const note = (text ?? "").trim();
    const quoted =
      `${note ? `${note}\n\n` : ""}` +
      `---------- İletilen ileti ----------\n` +
      `Kimden: ${msg.from.name ?? msg.from.address} <${msg.from.address}>\n` +
      `Konu: ${msg.subject}\n\n` +
      msg.bodyText;
    const now = new Date();

    const { providerMessageId } = await this.mailbox.send({
      from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
      to: [{ address: recipient }],
      subject,
      text: quoted,
      html: textToHtml(quoted),
    });

    await this.tdb.withTenant(ctx, (tx) =>
      tx
        .insert(schema.emailMessages)
        .values({
          tenantId: ctx.tenantId,
          threadId: msg.threadId,
          accountId: msg.accountId,
          direction: "outbound",
          messageId: providerMessageId,
          from: { name: "Entegre Safety", address: this.cfg.SMTP_FROM },
          to: [{ name: null, address: recipient }],
          subject,
          snippet: `İletildi: ${recipient}`,
          bodyText: quoted,
          bodyHtml: textToHtml(quoted),
          receivedAt: now,
          isRead: true,
          aiStatus: "none",
        })
        .onConflictDoNothing(),
    );

    return { ok: true, providerMessageId };
  }
}
