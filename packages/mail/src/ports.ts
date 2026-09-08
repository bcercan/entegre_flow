export interface MailAddress {
  name?: string | null;
  address: string;
}

export interface OutboundMessage {
  from: MailAddress;
  to: MailAddress[];
  subject: string;
  text: string;
  html: string;
  /** RFC822 Message-ID of the message being replied to (in-thread). */
  inReplyTo?: string | null;
  references?: string[];
  /** Dedup key surfaced to the provider where supported. */
  idempotencyKey?: string;
}

export interface SendResult {
  providerMessageId: string;
}

/**
 * Mailbox send port. Phase 1 implements SMTP (SmtpSender); Graph/Gmail arrive
 * behind the same interface later.
 */
export interface MailboxProvider {
  readonly id: string;
  send(msg: OutboundMessage): Promise<SendResult>;
  healthCheck(): Promise<{ ok: boolean }>;
}

/** IMAP fetch cursor. A UIDVALIDITY change forces a re-sync (lastUid reset). */
export interface MailCursor {
  folder: string;
  uidValidity: string | null;
  lastUid: number;
}

export interface RawInboundMessage {
  uid: number;
  messageId: string; // RFC822 Message-ID
  inReplyTo: string | null;
  references: string[];
  from: MailAddress;
  to: MailAddress[];
  subject: string;
  text: string;
  html: string | null;
  receivedAt: Date;
}

/**
 * Mailbox fetch port. Phase 1 implements IMAP (ImapFetcher). Graph/Gmail swap
 * only the cursor + transport behind this same interface.
 */
export interface MailboxFetcher {
  fetchSince(cursor: MailCursor): Promise<{ messages: RawInboundMessage[]; nextCursor: MailCursor }>;
  healthCheck(): Promise<{ ok: boolean }>;
}
