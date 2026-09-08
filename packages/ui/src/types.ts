import type { AiStatus } from "@entegreflow/contracts";

/** View-model for a row in the inbox list (thread + latest message, flattened). */
export interface InboxItem {
  id: string; // message id
  threadId: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  company: string;
  unread: boolean;
  aiStatus: AiStatus;
}

/** View-model for the opened message in the reading pane. */
export interface MailMessageView {
  subject: string;
  fromName: string;
  fromEmail: string;
  company: string;
  toAddress: string;
  date: string;
  bodyText: string;
  role?: string | null;
}
