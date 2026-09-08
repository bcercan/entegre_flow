"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AIPanel,
  MailList,
  MailView,
  NavRail,
  TopBar,
  initials,
  type Folder,
  type InboxItem,
  type MailMessageView,
} from "@entegreflow/ui";
import * as Ic from "@entegreflow/icons";
import type { AnalysisResult, InboxRow } from "@entegreflow/api-client";
import { ApiError } from "@entegreflow/api-client";
import type { SessionUser } from "@entegreflow/contracts";
import { api, setToken } from "../lib/api";

function timeOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function toInboxItem(r: InboxRow): InboxItem {
  return {
    id: r.id,
    threadId: r.threadId,
    from: r.from.name ?? r.from.address,
    subject: r.subject,
    preview: r.snippet,
    time: timeOf(r.receivedAt),
    company: r.company ?? "",
    unread: !r.isRead,
    aiStatus: r.aiStatus,
  };
}

const FOLDER_TITLES: Record<Folder, string> = {
  ai: "AI Kutusu",
  inbox: "Gelen Kutusu",
  answered: "Yanıtlananlar",
  other: "Diğer",
};

export function Workspace() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [folder, setFolder] = useState<Folder>("ai");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<MailMessageView | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done">("idle");
  const [toast, setToast] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    const inbox = await api.inbox();
    setRows(inbox);
    return inbox;
  }, []);

  // Boot: if a token exists, try to load the inbox; a 401 means log in.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadInbox();
        if (alive) setUser((u) => u ?? ({ displayName: "EntegreFlow" } as SessionUser));
      } catch {
        setToken(null);
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadInbox]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const items = useMemo(() => {
    const mapped = rows.map(toInboxItem);
    if (folder === "answered") return mapped.filter((m) => m.aiStatus === "answered");
    if (folder === "other") return [];
    if (folder === "ai")
      return mapped.filter((m) => ["pending", "ready", "risk", "info", "analyzing"].includes(m.aiStatus));
    return mapped;
  }, [rows, folder]);

  const counts = useMemo(
    () => ({
      ai: rows.filter((r) => ["pending", "ready", "risk", "info"].includes(r.aiStatus)).length,
      inbox: rows.filter((r) => !r.isRead).length,
    }),
    [rows],
  );

  const openMail = useCallback(async (id: string) => {
    setSelectedId(id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isRead: true } : r)));
    setPhase("analyzing");
    setAnalysis(null);
    try {
      const [msg, res] = await Promise.all([api.message(id), api.analyze(id)]);
      setMessage({
        subject: msg.subject,
        fromName: msg.from.name ?? msg.from.address,
        fromEmail: msg.from.address,
        company: res.customer?.name ?? "",
        toAddress: msg.to[0]?.address ?? "satis@entegresafety.com",
        date: new Date(msg.receivedAt).toLocaleString("tr-TR"),
        bodyText: msg.bodyText,
      });
      setAnalysis(res);
      setPhase("done");
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, aiStatus: res.warnings.some((w) => w.type === "danger") ? "risk" : "ready" } : r,
        ),
      );
    } catch (e) {
      setPhase("idle");
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Analiz başarısız");
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedId) return;
    try {
      const quote = await api.send(selectedId);
      setToast(`Teklif ${quote.number} müşteriye gönderildi`);
      setRows((rs) => rs.map((r) => (r.id === selectedId ? { ...r, aiStatus: "answered" } : r)));
    } catch (e) {
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Gönderim başarısız");
    }
  }, [selectedId]);

  if (booting) {
    return (
      <div className="login-wrap">
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Yükleniyor…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onDone={async (u) => { setUser(u); await loadInbox(); }} />;
  }

  return (
    <div className="app" data-dark="false" data-density="comfortable">
      <TopBar userInitials={initials(user.displayName || "EntegreFlow")} />
      <div className="body">
        <NavRail folder={folder} setFolder={setFolder} counts={counts} />
        <MailList
          items={items}
          title={FOLDER_TITLES[folder]}
          selectedId={selectedId}
          onSelect={(id) => void openMail(id)}
        />
        <div className="mailview-wrap">
          <MailView message={message} onReply={() => selectedId && void openMail(selectedId)} />
          <AIPanel
            analysis={analysis}
            customer={analysis?.customer ?? null}
            phase={phase}
            onSend={() => void handleSend()}
            onRegen={() => selectedId && void openMail(selectedId)}
          />
        </div>
      </div>
      {toast ? (
        <div className="toast-wrap">
          <div className="toast">
            <span className="ti">
              <Ic.Check size={14} />
            </span>
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoginForm({ onDone }: { onDone: (u: SessionUser) => void | Promise<void> }) {
  const [email, setEmail] = useState("admin@entegreflow.local");
  const [password, setPassword] = useState("Passw0rd!");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await api.login(email, password);
      setToken(res.accessToken);
      await onDone(res.user);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Giriş başarısız");
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark" style={{ width: 40, height: 40 }}>
          <Ic.Shield size={20} />
        </div>
        <h1>
          Entegre<span style={{ color: "var(--accent)" }}>Flow</span>
        </h1>
        <div className="sub">AI Satış &amp; Teklif Asistanı</div>
        <label className="login-field">
          <span>E-posta</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label className="login-field">
          <span>Parola</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {err ? <div className="login-err">{err}</div> : null}
        <button className="btn primary" type="submit" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
    </div>
  );
}
