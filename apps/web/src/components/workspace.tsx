"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AIPanel,
  CalendarView,
  ComposeModal,
  MailList,
  MailView,
  NavRail,
  TopBar,
  initials,
  type AttachmentView,
  type ComposeMode,
  type Folder,
  type InboxItem,
  type MailMessageView,
  type ThreadMessageView,
} from "@entegreflow/ui";
import * as Ic from "@entegreflow/icons";
import { accentColors, type AccentColorId } from "@entegreflow/tokens";
import type { AnalysisResult, InboxRow } from "@entegreflow/api-client";
import { ApiError } from "@entegreflow/api-client";
import type { SessionUser } from "@entegreflow/contracts";
import { api, setToken } from "../lib/api";

function timeOf(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) {
    return "Dün";
  }
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** Bucket a message into a date group used for the list section headers. */
function groupOf(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return "Bu Hafta";
  if (days < 14) return "Geçen Hafta";
  if (days < 30) return "Bu Ay";
  return "Daha Eski";
}

function toInboxItem(r: InboxRow, isPinned = false): InboxItem {
  return {
    id: r.id,
    threadId: r.threadId,
    from: r.from.name ?? r.from.address,
    subject: r.subject,
    preview: r.snippet,
    time: timeOf(r.receivedAt),
    company: r.company ?? "",
    unread: !r.isRead,
    flagged: r.isFlagged,
    pinned: isPinned,
    aiStatus: r.aiStatus,
    threadStatus: r.threadStatus,
    group: isPinned ? "Sabitlendi" : groupOf(r.receivedAt),
  };
}

const FOLDER_TITLES: Record<Folder, string> = {
  ai: "AI Kutusu",
  inbox: "Gelen Kutusu",
  answered: "Gönderilen",
  drafts: "Taslaklar",
  other: "Arşiv",
  trash: "Çöp Kutusu",
};

type ThreadStatus = "inbox" | "answered" | "other" | "deleted";
// AI Kutusu is a smart view over the inbox; the rest map to a real thread status.
const statusOfFolder = (f: Folder): ThreadStatus =>
  f === "answered" ? "answered" : f === "other" ? "other" : f === "trash" ? "deleted" : "inbox";

export function Workspace() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("ef_dark");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    if (typeof window === "undefined") return "comfortable";
    try {
      const saved = localStorage.getItem("ef_density");
      return saved === "compact" || saved === "comfortable" ? saved : "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const handleSetDark = useCallback((val: boolean) => {
    setDark(val);
    try {
      localStorage.setItem("ef_dark", String(val));
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ef_dark", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSetDensity = useCallback((d: "comfortable" | "compact") => {
    setDensity(d);
    try {
      localStorage.setItem("ef_density", d);
    } catch {
      /* ignore */
    }
  }, []);

  const [accent, setAccent] = useState<AccentColorId>(() => {
    if (typeof window === "undefined") return "blue";
    try {
      const saved = localStorage.getItem("ef_accent");
      return (saved as AccentColorId) || "blue";
    } catch {
      return "blue";
    }
  });

  const handleSetAccent = useCallback((a: AccentColorId) => {
    setAccent(a);
    try {
      localStorage.setItem("ef_accent", a);
    } catch {
      /* ignore */
    }
  }, []);

  const activeAccentOption = useMemo(
    () =>
      accentColors.find((c) => c.id === accent) ?? {
        id: "blue" as const,
        label: "Mavi",
        light: "#0f6cbd",
        dark: "#479ef5",
      },
    [accent]
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [activeApp, setActiveApp] = useState<"mail" | "calendar">("mail");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());
  const [calendarNewEventOpen, setCalendarNewEventOpen] = useState(false);
  const prevW = useRef(typeof window !== "undefined" ? window.innerWidth : 1600);
  const [mailListW, setMailListW] = useState(352); // px, drag-resizable
  const mailListWRef = useRef(352);
  const [query, setQuery] = useState("");
  const [searchRows, setSearchRows] = useState<InboxRow[]>([]);
  const [compose, setCompose] = useState<{
    mode: ComposeMode;
    draftThreadId?: string;
    initial?: { to?: string; cc?: string; bcc?: string; subject?: string; html?: string };
  } | null>(null);
  const [composeSending, setComposeSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [folder, setFolder] = useState<Folder>("ai");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<MailMessageView | null>(null);
  const [conversation, setConversation] = useState<ThreadMessageView[]>([]);
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ number: string } | null>(null);
  // Bumped on every fresh analysis so the draft editor remounts (no stale text).
  const [analysisSeq, setAnalysisSeq] = useState(0);
  const [counts, setCounts] = useState({ ai: 0, inbox: 0 });
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("ef_pinned_items");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const handleTogglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        localStorage.setItem("ef_pinned_items", JSON.stringify(next));
      } catch {
        /* storage quota / private mode */
      }
      return next;
    });
  }, []);

  // Load the active folder's messages. "Gönderilen" is the Sent box (outbound).
  const loadFolder = useCallback(async (f: Folder) => {
    const list =
      f === "answered" ? await api.sent() : f === "drafts" ? await api.drafts() : await api.inbox(statusOfFolder(f));
    setRows(list);
    return list;
  }, []);

  // Inbox-scoped badges (AI queue + unread), independent of the folder being viewed.
  const loadCounts = useCallback(async () => {
    const inbox = await api.inbox("inbox");
    setCounts({
      ai: inbox.filter((r) => ["pending", "ready", "risk", "info"].includes(r.aiStatus)).length,
      inbox: inbox.filter((r) => !r.isRead).length,
    });
    return inbox;
  }, []);

  // Full thread (conversation view) for the reading pane.
  const loadConversation = useCallback(async (id: string) => {
    const thread = await api.threadMessages(id);
    setConversation(
      thread.map((t) => ({
        id: t.id,
        fromName: t.from.name ?? t.from.address,
        fromEmail: t.from.address,
        date: new Date(t.receivedAt).toLocaleString("tr-TR"),
        bodyText: t.bodyText,
        outbound: t.direction === "outbound",
      })),
    );
  }, []);

  // Attachments for the opened message.
  const loadAttachments = useCallback(async (id: string) => {
    const list = await api.attachments(id);
    setAttachments(
      list.map((a) => ({ id: a.id, name: a.filenameDisplay, mime: a.mime, size: a.sizeBytes })),
    );
  }, []);

  const handleDownload = useCallback(async (id: string) => {
    try {
      const { url } = await api.attachmentUrl(id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "İndirme başarısız");
    }
  }, []);

  // Boot: probe auth via the counts fetch; a 401 means log in.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadCounts();
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
  }, [loadCounts]);

  // Reload the list whenever the folder changes (once logged in).
  useEffect(() => {
    if (!user) return;
    void loadFolder(folder);
  }, [user, folder, loadFolder]);

  // Background sync: refresh badges + the current folder every 30s (foreground only).
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadCounts();
      void loadFolder(folder);
    }, 30_000);
    return () => clearInterval(iv);
  }, [user, folder, loadCounts, loadFolder]);

  // Manual "Eşitle" — pull the latest server state now.
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await Promise.all([loadCounts(), loadFolder(folder)]);
    } finally {
      setSyncing(false);
    }
  }, [loadCounts, loadFolder, folder]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Theme is driven from the document root so the whole tree (login/booting
  // screens included) switches consistently. `.app` also mirrors it below.
  useEffect(() => {
    document.documentElement.setAttribute("data-dark", dark ? "true" : "false");
  }, [dark]);

  // Auto-collapse panels as the viewport narrows (and restore when it widens),
  // acting only on breakpoint crossings so manual toggles aren't fought mid-range.
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const p = prevW.current;
      if (w < 1200 && p >= 1200) setAiOpen(false);
      else if (w >= 1200 && p < 1200) setAiOpen(true);
      if (w < 980 && p >= 980) setNavOpen(false);
      else if (w >= 980 && p < 980) setNavOpen(true);
      prevW.current = w;
    };
    const w0 = window.innerWidth;
    if (w0 < 1200) setAiOpen(false);
    if (w0 < 980) setNavOpen(false);
    prevW.current = w0;
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Restore a saved mail-list width (client-only, avoids hydration mismatch).
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("ef-ml-w"));
      if (v) {
        const clamped = Math.min(560, Math.max(240, v));
        setMailListW(clamped);
        mailListWRef.current = clamped;
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  // Drag the splitter between the mail list and the reading pane.
  const startMailListResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = mailListWRef.current;
    const onMove = (ev: PointerEvent) => {
      const w = Math.min(560, Math.max(240, startW + (ev.clientX - startX)));
      mailListWRef.current = w;
      setMailListW(w);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        localStorage.setItem("ef-ml-w", String(mailListWRef.current));
      } catch {
        /* ignore */
      }
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // Server-side search (debounced). Empty query clears to the folder list.
  useEffect(() => {
    if (!user) return;
    const q = query.trim();
    if (!q) {
      setSearchRows([]);
      return;
    }
    const t = setTimeout(() => {
      api.search(q).then(setSearchRows).catch(() => setSearchRows([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, user]);

  // ⌘K / Ctrl+K focuses the search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        document.getElementById("ef-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = query.trim().length > 0;
  const items = useMemo(() => {
    const isPinned = (id: string) => pinnedIds.includes(id);
    const mapRow = (r: InboxRow) => toInboxItem(r, isPinned(r.id));
    if (searching) return searchRows.map(mapRow); // server-side global search
    const mapped = rows.map(mapRow);
    // "answered"/"other" already come pre-filtered from the server by thread status.
    const filtered =
      folder === "ai"
        ? mapped.filter((m) => ["pending", "ready", "risk", "info", "analyzing"].includes(m.aiStatus))
        : mapped;

    // Outlook style: pinned emails stay grouped at the top under "Sabitlendi"
    const pinned = filtered.filter((item) => item.pinned);
    const unpinned = filtered.filter((item) => !item.pinned);
    return [...pinned, ...unpinned];
  }, [rows, searchRows, searching, folder, pinnedIds]);

  const openMail = useCallback(async (id: string) => {
    setSelectedId(id);
    setMobileDetail(true); // on phones, switch from list to reading view
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isRead: true } : r)));
    // Persist the read state, then refresh the unread badge.
    api.markRead(id, true).then(() => void loadCounts()).catch(() => {});
    setPhase("analyzing");
    setAnalysis(null);
    setSent(null);
    setConversation([]);
    setAttachments([]);
    void loadConversation(id).catch(() => {});
    void loadAttachments(id).catch(() => {});
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
      setAnalysisSeq((n) => n + 1);
      setPhase("done");
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, aiStatus: res.warnings.some((w) => w.type === "danger") ? "risk" : "ready" } : r,
        ),
      );
    } catch (e) {
      setPhase("error");
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Analiz başarısız");
    }
  }, [loadCounts, loadConversation, loadAttachments]);

  // Drop the currently-open message from the list view + reset the panels.
  const clearOpen = useCallback((id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    setMessage((m) => (selectedId === id ? null : m));
    if (selectedId === id) {
      setPhase("idle");
      setAnalysis(null);
      setSent(null);
      setConversation([]);
      setAttachments([]);
    }
  }, [selectedId]);

  // Archive / Unarchive:
  // If the message is currently in "other" (archive), unarchive it back to "inbox".
  // Otherwise, move it to "other" (archive).
  const handleArchive = useCallback(
    async (targetId?: string, targetThreadId?: string) => {
      const tid = targetId ?? selectedId;
      const row = rows.find((r) => r.id === tid) ?? searchRows.find((r) => r.id === tid);
      const threadId = targetThreadId ?? row?.threadId;
      if (!threadId) return;
      const isCurrentlyArchived = row?.threadStatus === "other" || folder === "other";
      try {
        if (isCurrentlyArchived) {
          await api.setThreadStatus(threadId, "inbox");
          if (tid && selectedId === tid) clearOpen(tid);
          setRows((rs) => rs.filter((r) => r.id !== tid));
          setSearchRows((rs) => rs.map((r) => (r.id === tid ? { ...r, threadStatus: "inbox" } : r)));
          setToast("İleti gelen kutusuna taşındı");
        } else {
          await api.setThreadStatus(threadId, "other");
          if (tid && selectedId === tid) clearOpen(tid);
          setRows((rs) => rs.filter((r) => r.id !== tid));
          setSearchRows((rs) => rs.map((r) => (r.id === tid ? { ...r, threadStatus: "other" } : r)));
          setToast("İleti arşive taşındı");
        }
        void loadCounts();
        void loadFolder(folder);
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "İşlem başarısız");
      }
    },
    [rows, searchRows, selectedId, folder, clearOpen, loadCounts, loadFolder],
  );

  const handleRestoreFromTrash = useCallback(
    async (targetId?: string, targetThreadId?: string) => {
      const tid = targetId ?? selectedId;
      const row = rows.find((r) => r.id === tid) ?? searchRows.find((r) => r.id === tid);
      const threadId = targetThreadId ?? row?.threadId;
      if (!threadId) return;
      try {
        await api.setThreadStatus(threadId, "inbox");
        if (tid && selectedId === tid) clearOpen(tid);
        setRows((rs) => rs.filter((r) => r.id !== tid));
        setSearchRows((rs) => rs.map((r) => (r.id === tid ? { ...r, threadStatus: "inbox" } : r)));
        setToast("İleti gelen kutusuna geri yüklendi");
        void loadCounts();
        void loadFolder(folder);
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Geri yükleme başarısız");
      }
    },
    [rows, searchRows, selectedId, folder, clearOpen, loadCounts, loadFolder],
  );

  // Delete → Trash (status "deleted"); in Trash, delete permanently (with confirm).
  const handleDelete = useCallback(async () => {
    const row = rows.find((r) => r.id === selectedId) ?? searchRows.find((r) => r.id === selectedId);
    if (!row) return;
    const isRowInTrash = folder === "trash" || row.threadStatus === "deleted";
    try {
      if (isRowInTrash) {
        if (!window.confirm("Bu ileti kalıcı olarak silinecek. Emin misiniz?")) return;
        await api.deleteThread(row.threadId);
        clearOpen(row.id);
        setSearchRows((rs) => rs.filter((r) => r.id !== row.id));
        setToast("İleti kalıcı olarak silindi");
      } else {
        await api.setThreadStatus(row.threadId, "deleted");
        clearOpen(row.id);
        setSearchRows((rs) => rs.filter((r) => r.id !== row.id));
        setToast("İleti çöp kutusuna taşındı");
        void loadCounts();
        void loadFolder(folder);
      }
    } catch (e) {
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Silme başarısız");
    }
  }, [rows, searchRows, selectedId, folder, clearOpen, loadCounts, loadFolder]);

  const handleDeleteRow = useCallback(
    async (id: string, threadId: string) => {
      const row = rows.find((r) => r.id === id) ?? searchRows.find((r) => r.id === id);
      const isRowInTrash = folder === "trash" || row?.threadStatus === "deleted";
      try {
        if (isRowInTrash) {
          if (!window.confirm("Bu ileti kalıcı olarak silinecek. Emin misiniz?")) return;
          await api.deleteThread(threadId);
          if (selectedId === id) clearOpen(id);
          setRows((rs) => rs.filter((r) => r.id !== id));
          setSearchRows((rs) => rs.filter((r) => r.id !== id));
          setToast("İleti kalıcı olarak silindi");
        } else {
          await api.setThreadStatus(threadId, "deleted");
          if (selectedId === id) clearOpen(id);
          setRows((rs) => rs.filter((r) => r.id !== id));
          setSearchRows((rs) => rs.filter((r) => r.id !== id));
          setToast("İleti çöp kutusuna taşındı");
          void loadCounts();
          void loadFolder(folder);
        }
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Silme başarısız");
      }
    },
    [rows, searchRows, folder, selectedId, clearOpen, loadCounts, loadFolder],
  );

  const handleEmptyTrash = useCallback(async () => {
    if (!window.confirm("Çöp kutusundaki tüm iletiler kalıcı olarak silinecek. Emin misiniz?")) return;
    try {
      const { removed } = await api.emptyTrash();
      setRows([]);
      clearOpen(selectedId ?? "");
      setToast(removed ? `${removed} ileti kalıcı silindi` : "Çöp kutusu zaten boş");
    } catch (e) {
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Boşaltma başarısız");
    }
  }, [selectedId, clearOpen]);

  const handleCompose = useCallback(
    async ({
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      files,
    }: {
      to: string;
      cc: string;
      bcc: string;
      subject: string;
      text: string;
      html: string;
      files: File[];
    }) => {
      if (!compose) return;
      setComposeSending(true);
      try {
        if (compose.mode === "new") {
          const attachments = files.length
            ? await Promise.all(files.map((f) => api.uploadAttachment(f)))
            : [];
          await api.compose({ to, cc, bcc, subject, text, html, attachments });
          if (compose.draftThreadId) await api.deleteThread(compose.draftThreadId); // consume the draft
          setToast("İleti gönderildi");
          setCompose(null);
          void loadCounts();
          if (folder === "answered" || folder === "drafts") void loadFolder(folder);
        } else if (selectedId) {
          if (compose.mode === "reply") await api.reply(selectedId, text, html);
          else await api.forward(selectedId, to, text);
          setToast(compose.mode === "reply" ? "Yanıt gönderildi" : "İleti iletildi");
          setCompose(null);
          void loadConversation(selectedId); // show the new outbound message in the thread
          if (compose.mode === "reply") {
            void loadCounts();
            if (folder === "inbox" || folder === "ai") void loadFolder(folder);
          }
        }
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Gönderim başarısız");
      } finally {
        setComposeSending(false);
      }
    },
    [selectedId, compose, folder, loadCounts, loadFolder, loadConversation],
  );

  // Open a draft back into the composer (edit mode).
  const openDraft = useCallback(
    async (id: string) => {
      const row = rows.find((r) => r.id === id);
      try {
        const msg = await api.message(id);
        setCompose({
          mode: "new",
          draftThreadId: row?.threadId,
          initial: {
            to: msg.to?.[0]?.address ?? "",
            subject: msg.subject === "(konu yok)" ? "" : msg.subject,
            html: msg.bodyHtml ?? undefined,
          },
        });
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Taslak açılamadı");
      }
    },
    [rows],
  );

  const handleSaveDraft = useCallback(
    async ({ to, cc, bcc, subject, text, html }: { to: string; cc: string; bcc: string; subject: string; text: string; html: string }) => {
      setComposeSending(true);
      try {
        await api.saveDraft({ to, cc, bcc, subject, text, html });
        if (compose?.draftThreadId) await api.deleteThread(compose.draftThreadId); // replace old draft
        setToast("Taslak kaydedildi");
        setCompose(null);
        if (folder === "drafts") void loadFolder("drafts");
      } catch (e) {
        setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Taslak kaydedilemedi");
      } finally {
        setComposeSending(false);
      }
    },
    [compose, folder, loadFolder],
  );

  const handleToggleFlag = useCallback(
    async (id: string) => {
      const cur = (rows.find((r) => r.id === id) ?? searchRows.find((r) => r.id === id))?.isFlagged ?? false;
      const next = !cur;
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isFlagged: next } : r)));
      setSearchRows((rs) => rs.map((r) => (r.id === id ? { ...r, isFlagged: next } : r)));
      try {
        await api.markFlag(id, next);
      } catch {
        /* keep optimistic state */
      }
    },
    [rows, searchRows],
  );

  const handleMarkUnread = useCallback(async () => {
    if (!selectedId) return;
    const row = rows.find((r) => r.id === selectedId) ?? searchRows.find((r) => r.id === selectedId);
    const nextRead = row?.isRead ? false : true;
    setRows((rs) => rs.map((r) => (r.id === selectedId ? { ...r, isRead: nextRead } : r)));
    setSearchRows((rs) => rs.map((r) => (r.id === selectedId ? { ...r, isRead: nextRead } : r)));
    try {
      await api.markRead(selectedId, nextRead);
      void loadCounts();
      setToast(nextRead ? "İleti okundu olarak işaretlendi" : "İleti okunmadı olarak işaretlendi");
    } catch {
      /* keep optimistic state */
    }
  }, [selectedId, rows, searchRows, loadCounts]);

  const handleSend = useCallback(async () => {
    if (!selectedId || sending) return; // guard against double-submit
    setSending(true);
    try {
      const quote = await api.send(selectedId);
      setSent({ number: quote.number });
      setToast(`Teklif ${quote.number} müşteriye gönderildi`);
      setRows((rs) => rs.map((r) => (r.id === selectedId ? { ...r, aiStatus: "answered" } : r)));
      // The thread is now "answered" — refresh badges (and the list if we're on inbox/ai).
      void loadCounts();
      if (folder === "inbox" || folder === "ai") void loadFolder(folder);
    } catch (e) {
      setToast(e instanceof ApiError ? `Hata: ${e.message}` : "Gönderim başarısız");
    } finally {
      setSending(false);
    }
  }, [selectedId, sending, folder, loadCounts, loadFolder]);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setProfileOpen(false);
    setHelpOpen(false);
    setCompose(null);
    setSelectedId(null);
    setMessage(null);
    setConversation([]);
    setAttachments([]);
    setAnalysis(null);
    setQuery("");
    setSearchRows([]);
    setToast("Oturum kapatıldı");
  }, []);

  const selectedRow = useMemo(
    () => (selectedId ? (rows.find((r) => r.id === selectedId) ?? searchRows.find((r) => r.id === selectedId)) : undefined),
    [rows, searchRows, selectedId],
  );
  const isArchived = selectedRow ? selectedRow.threadStatus === "other" || folder === "other" : folder === "other";
  const isTrash = selectedRow ? selectedRow.threadStatus === "deleted" || folder === "trash" : folder === "trash";

  if (booting) {
    return (
      <div className="login-wrap">
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Yükleniyor…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onDone={async (u) => { setUser(u); await loadCounts(); }} />;
  }

  return (
    <div
      className="app"
      data-dark={dark ? "true" : "false"}
      data-density={density}
      data-accent={accent}
      style={{
        "--accent": dark ? activeAccentOption.dark : activeAccentOption.light,
      } as React.CSSProperties}
    >
      <TopBar
        userInitials={initials(user.displayName || user.email || "EF")}
        userDisplayName={user.displayName || user.email}
        dark={dark}
        onToggleTheme={handleToggleTheme}
        onToggleNav={() => setNavOpen((o) => !o)}
        onHelp={() => setHelpOpen(true)}
        onProfile={() => setProfileOpen((p) => !p)}
        query={query}
        onQuery={setQuery}
      />
      <div
        className={`body${mobileDetail ? " mobile-detail" : ""}`}
        style={{ "--ml-w": `${mailListW}px` } as React.CSSProperties}
      >
        <NavRail
          folder={folder}
          setFolder={setFolder}
          counts={counts}
          open={navOpen}
          onCompose={() => setCompose({ mode: "new" })}
          activeApp={activeApp}
          onSelectApp={(app) => {
            setActiveApp(app);
            setMobileDetail(false);
          }}
          selectedCalendarDate={selectedCalendarDate}
          onSelectCalendarDate={setSelectedCalendarDate}
          onNewCalendarEvent={() => setCalendarNewEventOpen(true)}
        />
        {activeApp === "calendar" ? (
          <CalendarView
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            newEventOpen={calendarNewEventOpen}
            onCloseNewEvent={() => setCalendarNewEventOpen(false)}
            onComposeMail={(to, subject) => {
              setActiveApp("mail");
              setCompose({
                mode: "new",
                initial: { to: to ?? "", subject: subject ?? "" },
              });
            }}
          />
        ) : (
          <>
            <MailList
              items={items}
              title={searching ? `“${query.trim()}” araması` : FOLDER_TITLES[folder]}
              selectedId={selectedId}
              onSelect={(id) => (folder === "drafts" ? void openDraft(id) : void openMail(id))}
              onSync={() => void handleSync()}
              syncing={syncing}
              trashMode={folder === "trash" && !searching}
              onEmptyTrash={() => void handleEmptyTrash()}
              onToggleFlag={(id) => void handleToggleFlag(id)}
              onTogglePin={handleTogglePin}
              onDelete={(id, threadId) => void handleDeleteRow(id, threadId)}
              onRestore={
                folder === "other"
                  ? (id, threadId) => void handleArchive(id, threadId)
                  : folder === "trash"
                    ? (id, threadId) => void handleRestoreFromTrash(id, threadId)
                    : searching
                      ? (id, threadId) => {
                          const r = rows.find((x) => x.id === id) ?? searchRows.find((x) => x.id === id);
                          if (r?.threadStatus === "deleted") {
                            void handleRestoreFromTrash(id, threadId);
                          } else {
                            void handleArchive(id, threadId);
                          }
                        }
                      : undefined
              }
            />
            <div
              className="col-resizer"
              role="separator"
              aria-orientation="vertical"
              aria-label="Mail listesi genişliğini ayarla"
              onPointerDown={startMailListResize}
            />
            <div className="mailview-wrap">
              <MailView
                message={message}
                conversation={conversation}
                attachments={attachments}
                flagged={selectedRow?.isFlagged ?? false}
                isUnread={selectedRow ? !selectedRow.isRead : false}
                isArchived={isArchived}
                isTrash={isTrash}
                onRestoreToInbox={isTrash ? () => void handleRestoreFromTrash() : () => void handleArchive()}
                onToggleFlag={() => selectedId && void handleToggleFlag(selectedId)}
                onBack={() => setMobileDetail(false)}
                onDownload={(id) => void handleDownload(id)}
                onReply={() => {
                  setAiOpen(true); // asking the AI reveals its panel if collapsed
                  if (selectedId) void openMail(selectedId);
                }}
                onReplyMail={() => setCompose({ mode: "reply" })}
                onForward={() => setCompose({ mode: "forward" })}
                onArchive={() => void handleArchive()}
                onDelete={() => void handleDelete()}
                onMarkUnread={() => void handleMarkUnread()}
                aiOpen={aiOpen}
                onToggleAi={() => setAiOpen((o) => !o)}
              />
              {aiOpen ? (
                <AIPanel
                  analysis={analysis}
                  customer={analysis?.customer ?? null}
                  phase={phase}
                  sending={sending}
                  sent={sent}
                  recipientEmail={message?.fromEmail ?? ""}
                  draftKey={analysisSeq}
                  onSend={() => void handleSend()}
                  onRegen={() => selectedId && void openMail(selectedId)}
                  onRetry={() => selectedId && void openMail(selectedId)}
                  onCollapse={() => setAiOpen(false)}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
      {helpOpen ? (
        <div className="modal-back" onClick={() => setHelpOpen(false)}>
          <div className="modal help-modal" role="dialog" aria-label="Yardım" onClick={(e) => e.stopPropagation()}>
            <div className="help-h">
              <span className="help-orb">
                <Ic.Sparkle size={16} />
              </span>
              <div>
                <h3>EntegreFlow nasıl çalışır?</h3>
                <div className="help-sub">AI destekli teklif akışı — 4 adım</div>
              </div>
              <button className="icon-btn" title="Kapat" aria-label="Kapat" style={{ marginLeft: "auto" }} onClick={() => setHelpOpen(false)}>
                <Ic.X size={18} />
              </button>
            </div>
            <div className="help-b">
              <ol className="help-steps">
                <li>
                  <b>Gelen talepler AI Kutusu'nda toplanır.</b> Yeni teklif e-postaları burada; rozetler
                  (Teklif hazır / Risk) durumu gösterir.
                </li>
                <li>
                  <b>Bir maili aç.</b> Asistan içeriği çözer, ürünleri <b>Dia kataloğuna</b> eşler,
                  stok/fiyat ve müşteri risk-limitini <b>gerçek zamanlı</b> çeker.
                </li>
                <li>
                  <b>Taslağı incele.</b> Sağdaki panelde kalemler, tutar ve uyarılar; taslağı düzenleyebilir
                  ya da yeniden oluşturabilirsin.
                </li>
                <li>
                  <b>Onayla ve gönder.</b> Müşteri limit aşımında ise açık onay ister; gönderim SMTP ile
                  yapılır ve konu <b>Gönderilen</b>'e geçer.
                </li>
              </ol>
              <div className="help-tips">
                <div><b>Klasörler:</b> Gelen Kutusu · Taslaklar · Gönderilen · Arşiv · Çöp Kutusu</div>
                <div><b>Kısayollar:</b> ⌘K arama · compose'da ⌘Enter gönder · listede ok tuşlarıyla gezin</div>
                <div><b>Eşitle</b> ile yeni postaları çeker; liste her 30 sn'de bir kendini günceller.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {profileOpen && user ? (
        <>
          <div className="pop-backdrop" onClick={() => setProfileOpen(false)} />
          <div className="profile-pop" role="dialog" aria-label="Kullanıcı Profili ve Ayarlar">
            <div className="pp-header">
              <div className="pp-avatar">
                {initials(user.displayName || user.email || "EF")}
              </div>
              <div className="pp-user-info">
                <div className="pp-name">{user.displayName || "Yönetici"}</div>
                <div className="pp-email">{user.email}</div>
                <div className="pp-role-wrap">
                  <span className="badge neutral sm">
                    {user.role === "admin" ? "Sistem Yöneticisi" : "Satış Temsilcisi"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pp-tenant">
              <div className="pp-tenant-ic">
                <Ic.Shield size={14} />
              </div>
              <div className="pp-tenant-text">
                <div className="pp-tenant-name">EntegreFlow Safety & PPE</div>
                <div className="pp-tenant-status">
                  <span className="live-dot" /> Dia ERP Bağlı (Canlı)
                </div>
              </div>
            </div>

            <div className="pp-divider" />

            <div className="pp-sec-title">Görünüm & Tercihler</div>

            <div className="pp-pref-row">
              <span>Tema</span>
              <div className="sp-seg">
                <button
                  type="button"
                  className={!dark ? "on" : ""}
                  onClick={() => handleSetDark(false)}
                >
                  Açık
                </button>
                <button
                  type="button"
                  className={dark ? "on" : ""}
                  onClick={() => handleSetDark(true)}
                >
                  Koyu
                </button>
              </div>
            </div>

            <div className="pp-pref-row">
              <span>Yoğunluk</span>
              <div className="sp-seg">
                <button
                  type="button"
                  className={density === "comfortable" ? "on" : ""}
                  onClick={() => handleSetDensity("comfortable")}
                >
                  Rahat
                </button>
                <button
                  type="button"
                  className={density === "compact" ? "on" : ""}
                  onClick={() => handleSetDensity("compact")}
                >
                  Sıkışık
                </button>
              </div>
            </div>

            <div className="pp-palette-row">
              <span className="pp-palette-label">Tema Rengi</span>
              <div className="sp-palette">
                {accentColors.map((c) => {
                  const isSelected = accent === c.id;
                  const colorHex = dark ? c.dark : c.light;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`sp-color-btn${isSelected ? " active" : ""}`}
                      style={{ "--swatch-color": colorHex } as React.CSSProperties}
                      onClick={() => handleSetAccent(c.id)}
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? <Ic.Check size={13} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pp-divider" />

            <div className="pp-menu">
              <button
                type="button"
                className="pp-menu-item"
                onClick={() => {
                  setProfileOpen(false);
                  setHelpOpen(true);
                }}
              >
                <span className="pp-menu-ic"><Ic.Help size={15} /></span>
                <span>Kullanım Kılavuzu & Rehber</span>
              </button>
            </div>

            <div className="pp-divider" />

            <button
              type="button"
              className="pp-logout-btn"
              onClick={handleLogout}
            >
              <Ic.LogOut size={15} />
              <span>Oturumu Kapat</span>
            </button>
          </div>
        </>
      ) : null}
      {compose && (compose.mode === "new" || message) ? (
        <ComposeModal
          mode={compose.mode}
          message={message}
          initial={compose.initial}
          sending={composeSending}
          onClose={() => !composeSending && setCompose(null)}
          onSubmit={(p) => void handleCompose(p)}
          onSaveDraft={compose.mode === "new" ? (p) => void handleSaveDraft(p) : undefined}
        />
      ) : null}
      {toast ? (
        <div className="toast-wrap">
          <div className="toast" role="status" aria-live="polite">
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filledFeedback, setFilledFeedback] = useState(false);

  const fillDemo = () => {
    setEmail("admin@entegreflow.local");
    setPassword("Passw0rd!");
    setErr(null);
    setFilledFeedback(true);
    setTimeout(() => setFilledFeedback(false), 1200);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await api.login(email, password);
      setToken(res.accessToken);
      await onDone(res.user);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-container">
        {/* Sol Kolon: Ürün Yetenekleri & Değer Önerisi */}
        <div className="login-hero">
          <div className="login-tag">
            <span className="login-tag-pulse" />
            Yapay Zeka &amp; Dia ERP İstasyonu
          </div>

          <h1 className="login-title">
            Entegre<span className="gradient-text">Flow</span> ile Teklif Sürecinizi Otonomlaştırın
          </h1>

          <p className="login-desc">
            Müşterilerinizden gelen e-posta sipariş ve teklif taleplerini Dia ERP canlı verileriyle harmanlayıp
            dakikalar içinde proformaya dönüştürün.
          </p>

          <div className="login-features">
            <div className="login-feature-card">
              <div className="login-feature-ico ai">
                <Ic.Sparkle size={18} />
              </div>
              <div className="login-feature-info">
                <h4>Otonom Teklif &amp; E-Posta Analizi</h4>
                <p>E-postalardaki müşteri isteklerini, KKD ve endüstriyel ürün taleplerini anında ayrıştırır.</p>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-ico">
                <Ic.Database size={18} />
              </div>
              <div className="login-feature-info">
                <h4>Dia ERP Canlı Entegrasyonu</h4>
                <p>Stok miktarları, anlık müşteri iskonto oranları ve cari risk limitleri otomatik denetlenir.</p>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-ico">
                <Ic.Calendar size={18} />
              </div>
              <div className="login-feature-info">
                <h4>Entegre Takvim &amp; Sevkiyat</h4>
                <p>Müşteri teslimatlarını, sevkiyat tarihlerini ve saha randevularını tek ekranda planlayın.</p>
              </div>
            </div>
          </div>

          <div className="login-stats">
            <div className="login-stat">
              <span className="login-stat-val">%85</span>
              <span className="login-stat-lbl">Zaman Tasarrufu</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-val">&lt; 10 sn</span>
              <span className="login-stat-lbl">Yapay Zeka Yanıtı</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-val">100%</span>
              <span className="login-stat-lbl">Dia ERP Uyumu</span>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Cam Efektli Modern Giriş Kartı */}
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-head">
            <div className="login-card-brand">
              <div className="brand-mark">
                <Ic.Shield size={20} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                Entegre<span style={{ color: "var(--accent)" }}>Flow</span>
              </span>
            </div>
            <h2>Oturum Açın</h2>
            <p className="sub">İş istasyonunuza erişmek için kurumsal kullanıcı bilgilerinizle giriş yapın.</p>
          </div>

          {/* Hızlı Demo Doldurma Butonu */}
          <div
            className="login-quick-demo"
            onClick={fillDemo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fillDemo()}
            title="Demo bilgilerini otomatik doldur"
          >
            <div className="login-quick-demo-left">
              <Ic.Zap size={14} />
              <span>{filledFeedback ? "Bilgiler dolduruldu!" : "Demo hesabı ile doldur"}</span>
            </div>
            <span className="login-quick-demo-badge">admin</span>
          </div>

          <div className="login-field-group">
            <label className="login-field">
              <span className="login-field-label">E-posta Adresi</span>
              <div className="login-input-box">
                <div className="login-input-ico">
                  <Ic.Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adiniz@sirket.com"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-field-label">Parola</span>
              <div className="login-input-box">
                <div className="login-input-ico">
                  <Ic.Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  title={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                  tabIndex={-1}
                >
                  {showPassword ? <Ic.EyeOff size={16} /> : <Ic.Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          <div className="login-extra">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Beni hatırla</span>
            </label>
          </div>

          {err ? (
            <div className="login-err-banner">
              <Ic.Alert size={16} style={{ flex: "none" }} />
              <span>{err}</span>
            </div>
          ) : null}

          <button className="login-btn-primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <Ic.Refresh size={16} className="spinning" />
                <span>Giriş yapılıyor…</span>
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <Ic.ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} />
              </>
            )}
          </button>

          <div className="login-footer-security">
            <Ic.Shield size={13} />
            <span>256-bit SSL Kurumsal Güvenlik • Dia ERP Entegre</span>
          </div>
        </form>
      </div>
    </div>
  );
}
