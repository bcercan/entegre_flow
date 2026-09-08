import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import type { MailAddress, MailboxFetcher, MailCursor, RawInboundMessage } from "./ports";

export interface ImapConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

function firstAddress(a: AddressObject | AddressObject[] | undefined): MailAddress {
  const obj = Array.isArray(a) ? a[0] : a;
  const v = obj?.value?.[0];
  return { name: v?.name || null, address: v?.address ?? "" };
}

function allAddresses(a: AddressObject | AddressObject[] | undefined): MailAddress[] {
  const objs = Array.isArray(a) ? a : a ? [a] : [];
  return objs.flatMap((o) => o.value.map((v) => ({ name: v.name || null, address: v.address ?? "" })));
}

function toRaw(uid: number, p: ParsedMail): RawInboundMessage {
  const references = Array.isArray(p.references)
    ? p.references
    : p.references
      ? [p.references]
      : [];
  return {
    uid,
    messageId: p.messageId ?? `imap-${uid}@local`,
    inReplyTo: p.inReplyTo ?? null,
    references,
    from: firstAddress(p.from),
    to: allAddresses(p.to),
    subject: p.subject ?? "(konusuz)",
    text: p.text ?? "",
    html: typeof p.html === "string" ? p.html : null,
    receivedAt: p.date ?? new Date(),
  };
}

/**
 * IMAP fetch via imapflow. Incremental by UID: fetches messages with UID above
 * the cursor's lastUid; a UIDVALIDITY change resets the cursor (full re-sync).
 */
export class ImapFetcher implements MailboxFetcher {
  constructor(private readonly cfg: ImapConfig) {}

  private newClient(): ImapFlow {
    return new ImapFlow({
      host: this.cfg.host,
      port: this.cfg.port,
      secure: this.cfg.secure ?? false,
      auth: { user: this.cfg.user, pass: this.cfg.pass },
      logger: false,
    });
  }

  async fetchSince(
    cursor: MailCursor,
  ): Promise<{ messages: RawInboundMessage[]; nextCursor: MailCursor }> {
    const client = this.newClient();
    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const mb = client.mailbox;
        const uidValidity = mb ? String(mb.uidValidity) : null;
        // UIDVALIDITY change → the server renumbered; re-sync from scratch.
        const lastUid =
          cursor.uidValidity && cursor.uidValidity !== uidValidity ? 0 : cursor.lastUid;

        const messages: RawInboundMessage[] = [];
        let maxUid = lastUid;

        if (mb && mb.exists > 0) {
          for await (const msg of client.fetch(
            `${lastUid + 1}:*`,
            { uid: true, source: true },
            { uid: true },
          )) {
            // `*` in a UID range can re-yield the highest message → guard.
            if (msg.uid <= lastUid || !msg.source) continue;
            maxUid = Math.max(maxUid, msg.uid);
            messages.push(toRaw(msg.uid, await simpleParser(msg.source)));
          }
        }

        return {
          messages,
          nextCursor: { folder: "INBOX", uidValidity, lastUid: maxUid },
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  async healthCheck(): Promise<{ ok: boolean }> {
    try {
      const client = this.newClient();
      await client.connect();
      await client.logout();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
