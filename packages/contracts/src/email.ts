import { z } from "zod";

export const emailAddressSchema = z.object({
  name: z.string().nullable(),
  address: z.string().email(),
});
export type EmailAddress = z.infer<typeof emailAddressSchema>;

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  mime: z.string(),
  sizeBytes: z.number().int(),
  scanned: z.boolean(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const emailDirectionSchema = z.enum(["inbound", "outbound"]);
export type EmailDirection = z.infer<typeof emailDirectionSchema>;

/** AI processing state for an inbound message. */
export const aiStatusSchema = z.enum([
  "none", // not an RFQ / not processed
  "pending", // queued for analysis
  "analyzing",
  "ready", // analysis done, draft available
  "risk", // analysis done, has danger warning
  "info", // info request, not a concrete order
  "answered",
  "failed",
]);
export type AiStatus = z.infer<typeof aiStatusSchema>;

export const emailMessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  direction: emailDirectionSchema,
  messageId: z.string(), // RFC822 Message-ID
  inReplyTo: z.string().nullable(),
  from: emailAddressSchema,
  to: z.array(emailAddressSchema),
  subject: z.string(),
  snippet: z.string(),
  /** Sanitized rendered body parts. text always present; html optional. */
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  receivedAt: z.string(), // ISO
  isRead: z.boolean(),
  aiStatus: aiStatusSchema,
  attachments: z.array(attachmentSchema).default([]),
});
export type EmailMessage = z.infer<typeof emailMessageSchema>;

export const threadStatusSchema = z.enum(["inbox", "answered", "other"]);
export type ThreadStatus = z.infer<typeof threadStatusSchema>;

export const emailThreadSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  customerId: z.string().uuid().nullable(),
  status: threadStatusSchema,
  lastMessageAt: z.string(),
  messageCount: z.number().int(),
});
export type EmailThread = z.infer<typeof emailThreadSchema>;
