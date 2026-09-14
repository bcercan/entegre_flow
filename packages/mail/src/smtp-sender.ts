import nodemailer, { type Transporter } from "nodemailer";
import type { MailAddress, MailboxProvider, OutboundMessage, SendResult } from "./ports";

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure?: boolean;
}

function fmtAddr(a: MailAddress): string {
  return a.name ? `"${a.name.replace(/"/g, "")}" <${a.address}>` : a.address;
}

/** SMTP mailbox provider (nodemailer). Dev target = Mailpit. */
export class SmtpSender implements MailboxProvider {
  readonly id = "imap-smtp";
  private readonly transport: Transporter;

  constructor(cfg: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure ?? false,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  }

  async send(msg: OutboundMessage): Promise<SendResult> {
    const info = await this.transport.sendMail({
      from: fmtAddr(msg.from),
      to: msg.to.map(fmtAddr).join(", "),
      cc: msg.cc?.length ? msg.cc.map(fmtAddr).join(", ") : undefined,
      bcc: msg.bcc?.length ? msg.bcc.map(fmtAddr).join(", ") : undefined,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      inReplyTo: msg.inReplyTo ?? undefined,
      references: msg.references?.length ? msg.references.join(" ") : undefined,
      attachments: msg.attachments?.length
        ? msg.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          }))
        : undefined,
    });
    return { providerMessageId: info.messageId };
  }

  async healthCheck(): Promise<{ ok: boolean }> {
    try {
      await this.transport.verify();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
