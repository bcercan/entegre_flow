import type { AiStatus, ThreadStatus } from "@entegreflow/contracts";

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
  flagged: boolean;
  pinned?: boolean;
  aiStatus: AiStatus;
  threadStatus?: ThreadStatus;
  /** Date bucket label for list grouping (e.g. "Bugün", "Bu Hafta"). */
  group?: string;
}

/** An attachment shown in the reading pane. */
export interface AttachmentView {
  id: string;
  name: string;
  mime: string;
  size: number;
}

/** One message inside the reading pane's conversation view. */
export interface ThreadMessageView {
  id: string;
  fromName: string;
  fromEmail: string;
  date: string;
  bodyText: string;
  outbound: boolean;
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
