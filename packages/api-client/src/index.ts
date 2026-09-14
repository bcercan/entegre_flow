import type {
  AiStatus,
  Customer,
  MessageAnalysis,
  Quote,
  SessionUser,
  ThreadStatus,
} from "@entegreflow/contracts";

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current access token (or null). Used for authed requests. */
  getToken?: () => string | null;
  /** Injectable fetch (defaults to global fetch) — keeps the client platform-neutral. */
  fetch?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface LoginResult {
  accessToken: string;
  user: SessionUser;
}

export interface InboxRow {
  id: string;
  threadId: string;
  from: { name: string | null; address: string };
  subject: string;
  snippet: string;
  receivedAt: string;
  aiStatus: AiStatus;
  isRead: boolean;
  isFlagged: boolean;
  company: string | null;
  threadStatus?: ThreadStatus;
}

export interface MessageRow {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string | null;
  from: { name: string | null; address: string };
  to: Array<{ name: string | null; address: string }>;
  receivedAt: string;
  aiStatus: AiStatus;
}

export interface Attachment {
  id: string;
  filenameDisplay: string;
  mime: string;
  sizeBytes: number;
}

export interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  from: { name: string | null; address: string };
  to: Array<{ name: string | null; address: string }>;
  subject: string;
  bodyText: string;
  receivedAt: string;
}

export interface ThreadRow {
  id: string;
  subject: string;
  status: ThreadStatus;
  customerId: string | null;
  lastMessageAt: string;
  messageCount: number;
}

export type AnalysisResult = MessageAnalysis & { customer: Customer | null };

export interface ApiClient {
  login(email: string, password: string): Promise<LoginResult>;
  /** Inbox rows for a folder (thread status); defaults to "inbox". */
  inbox(status?: ThreadStatus): Promise<InboxRow[]>;
  /** Sent box — outbound messages (recipient shown in `from`). */
  sent(): Promise<InboxRow[]>;
  /** Drafts box — unsent outbound messages. */
  drafts(): Promise<InboxRow[]>;
  /** Save a compose as a draft (no send). */
  saveDraft(input: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ ok: boolean; threadId: string; messageId: string }>;
  /** Stage a file in storage before composing; returns a ref to send. */
  uploadAttachment(file: File): Promise<{ storageKey: string; filename: string; mime: string; size: number }>;
  /** Compose a brand-new outgoing email (cc/bcc comma-separated). */
  compose(input: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{ storageKey: string; filename: string; mime: string; size: number }>;
  }): Promise<{ ok: boolean; providerMessageId: string; threadId: string }>;
  threads(): Promise<ThreadRow[]>;
  message(id: string): Promise<MessageRow>;
  /** All messages in the thread of :id, oldest → newest (conversation view). */
  threadMessages(id: string): Promise<ThreadMessage[]>;
  analyze(id: string): Promise<AnalysisResult>;
  /** Approve & send the drafted quote reply (HITL). Idempotent per thread. */
  send(id: string): Promise<Quote>;
  /** Persist a message's read/unread state. */
  markRead(id: string, isRead: boolean): Promise<{ id: string; isRead: boolean }>;
  /** Flag / unflag a message. */
  markFlag(id: string, isFlagged: boolean): Promise<{ id: string; isFlagged: boolean }>;
  /** Global search over non-deleted messages. */
  search(q: string): Promise<InboxRow[]>;
  /** Move a thread to a folder (inbox / answered / other = archive). */
  setThreadStatus(threadId: string, status: ThreadStatus): Promise<{ id: string; status: ThreadStatus }>;
  /** Plain in-thread reply to a message. */
  reply(id: string, text: string, html?: string): Promise<{ ok: boolean; providerMessageId: string }>;
  /** Forward a message to another recipient. */
  forward(id: string, to: string, text: string): Promise<{ ok: boolean; providerMessageId: string }>;
  /** Permanently delete a thread (used from Trash). */
  deleteThread(id: string): Promise<{ ok: boolean }>;
  /** Empty the Trash — permanently delete all "deleted" threads. */
  emptyTrash(): Promise<{ removed: number }>;
  /** Attachments belonging to a message. */
  attachments(id: string): Promise<Attachment[]>;
  /** A short-lived download URL for one attachment. */
  attachmentUrl(id: string): Promise<{ url: string }>;
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const doFetch = opts.fetch ?? globalThis.fetch;

  async function req<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    };
    if (auth && opts.getToken) {
      const token = opts.getToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }
    const res = await doFetch(`${opts.baseUrl}${path}`, { ...init, headers });
    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string; code?: string } }
      | T
      | null;
    if (!res.ok) {
      const err = (body as { error?: { message?: string; code?: string } } | null)?.error;
      throw new ApiError(res.status, err?.message ?? res.statusText, err?.code);
    }
    return body as T;
  }

  return {
    login: (email, password) =>
      req<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false),
    inbox: (status) => req<InboxRow[]>(`/inbox${status ? `?status=${status}` : ""}`),
    sent: () => req<InboxRow[]>("/inbox?box=sent"),
    drafts: () => req<InboxRow[]>("/inbox?box=drafts"),
    saveDraft: (input) =>
      req<{ ok: boolean; threadId: string; messageId: string }>("/drafts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    uploadAttachment: async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      const headers: Record<string, string> = {};
      const token = opts.getToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await doFetch(`${opts.baseUrl}/uploads`, { method: "POST", headers, body: fd });
      const body = (await res.json().catch(() => null)) as
        | { error?: { message?: string; code?: string } }
        | { storageKey: string; filename: string; mime: string; size: number }
        | null;
      if (!res.ok) {
        const err = (body as { error?: { message?: string; code?: string } } | null)?.error;
        throw new ApiError(res.status, err?.message ?? res.statusText, err?.code);
      }
      return body as { storageKey: string; filename: string; mime: string; size: number };
    },
    compose: (input) =>
      req<{ ok: boolean; providerMessageId: string; threadId: string }>("/compose", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    deleteThread: (id) => req<{ ok: boolean }>(`/threads/${id}`, { method: "DELETE" }),
    emptyTrash: () => req<{ removed: number }>("/trash", { method: "DELETE" }),
    threads: () => req<ThreadRow[]>("/threads"),
    message: (id) => req<MessageRow>(`/messages/${id}`),
    threadMessages: (id) => req<ThreadMessage[]>(`/messages/${id}/thread`),
    analyze: (id) => req<AnalysisResult>(`/messages/${id}/analyze`, { method: "POST" }),
    send: (id) => req<Quote>(`/messages/${id}/send`, { method: "POST" }),
    markRead: (id, isRead) =>
      req<{ id: string; isRead: boolean }>(`/messages/${id}/read`, {
        method: "PATCH",
        body: JSON.stringify({ isRead }),
      }),
    markFlag: (id, isFlagged) =>
      req<{ id: string; isFlagged: boolean }>(`/messages/${id}/flag`, {
        method: "PATCH",
        body: JSON.stringify({ isFlagged }),
      }),
    search: (q) => req<InboxRow[]>(`/search?q=${encodeURIComponent(q)}`),
    setThreadStatus: (threadId, status) =>
      req<{ id: string; status: ThreadStatus }>(`/threads/${threadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    reply: (id, text, html) =>
      req<{ ok: boolean; providerMessageId: string }>(`/messages/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text, html }),
      }),
    forward: (id, to, text) =>
      req<{ ok: boolean; providerMessageId: string }>(`/messages/${id}/forward`, {
        method: "POST",
        body: JSON.stringify({ to, text }),
      }),
    attachments: (id) => req<Attachment[]>(`/messages/${id}/attachments`),
    attachmentUrl: (id) => req<{ url: string }>(`/attachments/${id}/download-url`),
  };
}
