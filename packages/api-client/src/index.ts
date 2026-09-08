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
  company: string | null;
}

export interface MessageRow {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  bodyText: string;
  from: { name: string | null; address: string };
  to: Array<{ name: string | null; address: string }>;
  receivedAt: string;
  aiStatus: AiStatus;
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
  inbox(): Promise<InboxRow[]>;
  threads(): Promise<ThreadRow[]>;
  message(id: string): Promise<MessageRow>;
  analyze(id: string): Promise<AnalysisResult>;
  /** Approve & send the drafted quote reply (HITL). Idempotent per thread. */
  send(id: string): Promise<Quote>;
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
    inbox: () => req<InboxRow[]>("/inbox"),
    threads: () => req<ThreadRow[]>("/threads"),
    message: (id) => req<MessageRow>(`/messages/${id}`),
    analyze: (id) => req<AnalysisResult>(`/messages/${id}/analyze`, { method: "POST" }),
    send: (id) => req<Quote>(`/messages/${id}/send`, { method: "POST" }),
  };
}
