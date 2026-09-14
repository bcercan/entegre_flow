import { useRef, useState, type FC, type KeyboardEvent, type ReactNode } from "react";
import * as Ic from "@entegreflow/icons";
import type { IconProps } from "@entegreflow/icons";
import type { AiStatus } from "@entegreflow/contracts";
import { avatarFor, formatBytes, initials } from "./format";
import type { AttachmentView, InboxItem, MailMessageView, ThreadMessageView } from "./types";
import { CalendarSidebar } from "./calendar-view";

type BadgeKind = "ai" | "ok" | "warn" | "danger" | "neutral" | "accent";

export function Badge({
  kind = "neutral",
  icon: Icon,
  children,
  sm,
}: {
  kind?: BadgeKind;
  icon?: FC<IconProps>;
  children: ReactNode;
  sm?: boolean;
}) {
  return (
    <span className={`badge ${kind}${sm ? " sm" : ""}`}>
      {Icon ? <Icon size={sm ? 10 : 11} /> : null}
      {children}
    </span>
  );
}

const STATUS: Record<AiStatus, { kind: BadgeKind; icon: FC<IconProps>; label: string } | null> = {
  ready: { kind: "ai", icon: Ic.Sparkle, label: "Teklif hazır" },
  risk: { kind: "danger", icon: Ic.Alert, label: "Risk uyarısı" },
  info: { kind: "accent", icon: Ic.Info, label: "Bilgi talebi" },
  answered: { kind: "ok", icon: Ic.Check, label: "Yanıtlandı" },
  pending: { kind: "neutral", icon: Ic.Clock, label: "Sırada" },
  analyzing: { kind: "ai", icon: Ic.Sparkle, label: "Analiz ediliyor" },
  failed: { kind: "danger", icon: Ic.Alert, label: "Başarısız" },
  none: null,
};

export function TopBar({
  userInitials = "EÇ",
  userDisplayName,
  dark = true,
  onToggleTheme,
  onToggleNav,
  onHelp,
  onProfile,
  query = "",
  onQuery,
}: {
  userInitials?: string;
  userDisplayName?: string;
  dark?: boolean;
  onToggleTheme?: () => void;
  onToggleNav?: () => void;
  onHelp?: () => void;
  onProfile?: () => void;
  query?: string;
  onQuery?: (q: string) => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-btn hamburger" title="Klasörleri aç/kapat" aria-label="Klasörleri aç/kapat" onClick={onToggleNav}>
        <Ic.Menu size={18} />
      </button>
      <div className="brand">
        <div className="brand-mark">
          <Ic.Shield size={16} />
        </div>
        <div className="brand-name">
          Entegre<span>Flow</span>
        </div>
      </div>
      <label className="search">
        <Ic.Search size={15} />
        <input
          id="ef-search"
          placeholder="Mail, müşteri veya ürün ara…"
          aria-label="Ara"
          value={query}
          onChange={(e) => onQuery?.(e.target.value)}
        />
        {query ? (
          <button className="search-clear" title="Temizle" aria-label="Aramayı temizle" onClick={() => onQuery?.("")}>
            <Ic.X size={13} />
          </button>
        ) : (
          <kbd>⌘K</kbd>
        )}
      </label>
      <div className="topbar-spacer" />
      <div className="top-actions">
        <button
          className="icon-btn"
          title={dark ? "Açık temaya geç" : "Koyu temaya geç"}
          aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
          onClick={onToggleTheme}
        >
          {dark ? <Ic.Sun size={17} /> : <Ic.Moon size={17} />}
        </button>
        <button className="icon-btn" title="Yardım" aria-label="Yardım" onClick={onHelp}>
          <Ic.Help size={17} />
        </button>
        <button className="icon-btn" title="Bildirimler" aria-label="Bildirimler">
          <Ic.Bell size={17} />
        </button>
        <button
          type="button"
          className="avatar-btn"
          title={userDisplayName ? `${userDisplayName} (Hesap & Tercihler)` : "Hesap ve Tercihler"}
          aria-label={userDisplayName ? `${userDisplayName} (Hesap & Tercihler)` : "Hesap ve Tercihler"}
          onClick={onProfile}
        >
          <div className="avatar" aria-hidden="true">
            {userInitials}
          </div>
        </button>
      </div>
    </header>
  );
}

export type Folder = "ai" | "inbox" | "answered" | "drafts" | "other" | "trash";

interface FolderItem {
  id: Folder;
  label: string;
  icon: FC<IconProps>;
  count?: number;
}

export function NavRail({
  folder,
  setFolder,
  counts,
  open = true,
  onCompose,
  activeApp = "mail",
  onSelectApp,
  selectedCalendarDate,
  onSelectCalendarDate,
  onNewCalendarEvent,
}: {
  folder: Folder;
  setFolder: (f: Folder) => void;
  counts: { ai: number; inbox: number };
  open?: boolean;
  onCompose?: () => void;
  activeApp?: "mail" | "calendar";
  onSelectApp?: (app: "mail" | "calendar") => void;
  selectedCalendarDate?: Date;
  onSelectCalendarDate?: (d: Date) => void;
  onNewCalendarEvent?: () => void;
}) {
  // Outlook app rail — Mail and Calendar
  const apps: Array<{ id: "mail" | "calendar"; icon: FC<IconProps>; label: string }> = [
    { id: "mail", icon: Ic.Mail, label: "Posta" },
    { id: "calendar", icon: Ic.Calendar, label: "Takvim" },
  ];
  // Only the folders that actually route. AI Kutusu is promoted to the hero above.
  const folders: FolderItem[] = [
    { id: "inbox", label: "Gelen Kutusu", icon: Ic.Inbox, count: counts.inbox },
    { id: "drafts", label: "Taslaklar", icon: Ic.Pen },
    { id: "answered", label: "Gönderilen", icon: Ic.Send },
    { id: "other", label: "Arşiv", icon: Ic.Archive },
    { id: "trash", label: "Çöp Kutusu", icon: Ic.Trash },
  ];
  return (
    <nav className="sidebar">
      <div className="iconrail">
        <button
          className="ir-item ir-add"
          title={activeApp === "calendar" ? "Yeni Etkinlik" : "Yeni Posta"}
          aria-label={activeApp === "calendar" ? "Yeni Etkinlik" : "Yeni Posta"}
          onClick={activeApp === "calendar" ? onNewCalendarEvent : onCompose}
        >
          <Ic.Plus size={18} />
        </button>
        {apps.map((a) => {
          const I = a.icon;
          const isActive = a.id === activeApp;
          return (
            <button
              key={a.id}
              className={`ir-item${isActive ? " active" : ""}`}
              title={a.label}
              aria-label={a.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectApp?.(a.id)}
            >
              <I size={19} />
            </button>
          );
        })}
      </div>
      {open ? (
        activeApp === "calendar" ? (
          <div className="folderpane">
            <CalendarSidebar
              selectedDate={selectedCalendarDate ?? new Date()}
              onSelectDate={onSelectCalendarDate ?? (() => {})}
              onNewEvent={onNewCalendarEvent ?? (() => {})}
            />
          </div>
        ) : (
          <div className="folderpane">
            <button className="compose-btn" onClick={onCompose}>
              <Ic.Edit size={16} /> Yeni Posta
            </button>
            <div className="fp-account">
              <span>satis@entegresafety.com</span>
            </div>
            <div className="fp-scroll scroll">
              {/* AI Kutusu — the product home, the protagonist of the workspace. */}
              <button
                className={`folder-hero${folder === "ai" ? " active" : ""}`}
                onClick={() => setFolder("ai")}
              >
                <span className="fh-orb">
                  <Ic.Sparkle size={17} />
                </span>
                <span className="fh-text">
                  <span className="fh-title">AI Kutusu</span>
                  <span className="fh-sub">İncelenecek talepler</span>
                </span>
                {counts.ai ? <span className="fh-count">{counts.ai}</span> : null}
              </button>

              <div className="fp-sec-body">
                {folders.map((f) => {
                  const I = f.icon;
                  return (
                    <button
                      key={f.id}
                      className={`folder${folder === f.id ? " active" : ""}`}
                      onClick={() => setFolder(f.id)}
                    >
                      <I size={16} className="f-ic" />
                      <span className="f-label">{f.label}</span>
                      {f.count ? <span className="f-count">{f.count}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : null}
    </nav>
  );
}

function MailRow({
  item,
  active,
  onClick,
  onToggleFlag,
  onTogglePin,
  onDelete,
  onRestore,
}: {
  item: InboxItem;
  active: boolean;
  onClick: () => void;
  onToggleFlag?: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}) {
  const st = STATUS[item.aiStatus];
  return (
    <button
      className={`mailrow ${item.unread ? "unread" : "read"}${active ? " active" : ""}${item.flagged ? " flagged" : ""}${item.pinned ? " pinned" : ""}`}
      onClick={onClick}
    >
      <div className="mr-main">
        <div className="mr-unread-col">
          {item.unread ? <span className="mr-unread" /> : null}
        </div>
        <div className="mr-avatar" style={{ background: avatarFor(item.from) }}>
          {initials(item.from)}
        </div>
        <div className="mr-content">
          <div className="mr-line-1">
            <span className="mr-from">{item.from}</span>
            <div className="mr-actions">
              {onRestore ? (
                <span
                  className="mr-action-btn restore"
                  role="button"
                  tabIndex={-1}
                  aria-label="Gelen Kutusuna Taşı"
                  data-tooltip="Gelen Kutusuna Taşı"
                  data-tooltip-pos="top"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                >
                  <Ic.Inbox size={14} />
                </span>
              ) : null}
              <span
                className={`mr-action-btn flag${item.flagged ? " active" : ""}`}
                role="button"
                tabIndex={-1}
                aria-label={item.flagged ? "Bayrağı kaldır" : "Bayrak ekle"}
                data-tooltip={item.flagged ? "Bayrağı kaldır" : "Bayrak ekle"}
                data-tooltip-pos="top"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFlag?.();
                }}
              >
                <Ic.Flag size={14} />
              </span>
              <span
                className={`mr-action-btn pin${item.pinned ? " active" : ""}`}
                role="button"
                tabIndex={-1}
                aria-label={item.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                data-tooltip={item.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                data-tooltip-pos="top"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin?.();
                }}
              >
                <Ic.Pin size={14} />
              </span>
              <span
                className="mr-action-btn delete"
                role="button"
                tabIndex={-1}
                aria-label="Sil"
                data-tooltip="Sil"
                data-tooltip-pos="top"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Ic.Trash size={14} />
              </span>
            </div>
          </div>
          <div className="mr-line-2">
            <span className="mr-subject">{item.subject}</span>
            <span className="mr-time">{item.time}</span>
          </div>
          <div className="mr-preview">{item.preview}</div>
          {st || item.company ? (
            <div className="mr-tags">
              {st ? (
                <Badge kind={st.kind} icon={st.icon} sm>
                  {st.label}
                </Badge>
              ) : null}
              {item.company ? <span className="mr-company">{item.company}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function MailList({
  items,
  title,
  selectedId,
  onSelect,
  onSync,
  syncing = false,
  trashMode = false,
  onEmptyTrash,
  onToggleFlag,
  onTogglePin,
  onDelete,
  onRestore,
}: {
  items: InboxItem[];
  title: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSync?: () => void;
  syncing?: boolean;
  trashMode?: boolean;
  onEmptyTrash?: () => void;
  onToggleFlag?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onDelete?: (id: string, threadId: string) => void;
  onRestore?: (id: string, threadId: string) => void;
}) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (grp: string) => {
    setCollapsed((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  // Arrow keys roam focus across mail rows; Enter/Space opens (native button behavior).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const btns = Array.from(rowsRef.current?.querySelectorAll<HTMLButtonElement>("button.mailrow") ?? []);
    if (!btns.length) return;
    e.preventDefault();
    const idx = btns.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(btns.length - 1, idx + 1) : Math.max(0, idx - 1);
    btns[idx === -1 ? 0 : next]?.focus();
  };
  return (
    <section className="maillist">
      <div className="ml-head">
        <div className="ml-title-row">
          <span className="ml-title">{title}</span>
          <span className="ml-count">{items.length} ileti</span>
          {trashMode ? (
            <button className="ml-empty-trash" onClick={onEmptyTrash}>
              <Ic.Trash size={13} /> Boşalt
            </button>
          ) : null}
          <button
            className={`ml-sync${syncing ? " spinning" : ""}`}
            title="Eşitle"
            aria-label="Eşitle"
            onClick={onSync}
            disabled={syncing}
          >
            <Ic.Refresh size={15} />
          </button>
        </div>
      </div>
      <div className="ml-rows scroll" ref={rowsRef} onKeyDown={onKeyDown}>
        {items.map((it, i) => {
          const isNewGroup = it.group && it.group !== items[i - 1]?.group;
          const isGroupCollapsed = Boolean(it.group && collapsed[it.group]);
          return (
            <div key={it.id} className="ml-item-wrapper">
              {isNewGroup ? (
                <div className={`ml-group${i === 0 ? " first" : ""}${isGroupCollapsed ? " collapsed" : ""}`}>
                  <button
                    type="button"
                    className="ml-group-btn"
                    onClick={() => toggleGroup(it.group!)}
                    aria-expanded={!isGroupCollapsed}
                  >
                    <Ic.ChevDown
                      size={12}
                      className={`ml-group-chevron${isGroupCollapsed ? " collapsed" : ""}`}
                    />
                    <span className="ml-group-title">{it.group}</span>
                  </button>
                </div>
              ) : null}
              {!isGroupCollapsed ? (
                <MailRow
                  item={it}
                  active={it.id === selectedId}
                  onClick={() => onSelect(it.id)}
                  onToggleFlag={() => onToggleFlag?.(it.id)}
                  onTogglePin={() => onTogglePin?.(it.id)}
                  onDelete={() => onDelete?.(it.id, it.threadId)}
                  onRestore={
                    onRestore && (it.threadStatus ? it.threadStatus === "other" || it.threadStatus === "deleted" : true)
                      ? () => onRestore(it.id, it.threadId)
                      : undefined
                  }
                />
              ) : null}
            </div>
          );
        })}
        {items.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            Bu klasörde ileti yok.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MessageBlock({ m, defaultOpen }: { m: ThreadMessageView; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`mv-msg${m.outbound ? " out" : ""}${open ? " open" : ""}`}>
      <button className="mv-msg-h" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="mv-av sm" style={{ background: avatarFor(m.fromName) }}>
          {initials(m.fromName)}
        </div>
        <div className="mv-msg-meta">
          <div className="mv-from-line">
            <span className="mv-from-name">{m.fromName}</span>
            {m.outbound ? (
              <Badge kind="accent" sm>
                Siz
              </Badge>
            ) : null}
          </div>
          {open ? (
            <div className="mv-from-mail">{m.fromEmail}</div>
          ) : (
            <div className="mv-msg-preview">{m.bodyText}</div>
          )}
        </div>
        <div className="mv-date">{m.date}</div>
      </button>
      {open ? <div className="mv-body">{m.bodyText}</div> : null}
    </div>
  );
}

export function MailView({
  message,
  conversation,
  attachments,
  flagged = false,
  onDownload,
  onReply,
  onReplyMail,
  onForward,
  onArchive,
  onDelete,
  onMarkUnread,
  onToggleFlag,
  onBack,
  aiOpen = true,
  onToggleAi,
  isArchived = false,
  isTrash = false,
  onRestoreToInbox,
  isUnread = false,
}: {
  message: MailMessageView | null;
  conversation?: ThreadMessageView[];
  attachments?: AttachmentView[];
  flagged?: boolean;
  onDownload?: (id: string) => void;
  onReply: () => void;
  onReplyMail?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onMarkUnread?: () => void;
  onToggleFlag?: () => void;
  onBack?: () => void;
  aiOpen?: boolean;
  onToggleAi?: () => void;
  isArchived?: boolean;
  isTrash?: boolean;
  onRestoreToInbox?: () => void;
  isUnread?: boolean;
}) {
  if (!message) {
    return (
      <div className="mailview">
        <div className="mv-empty">
          <div className="inner">
            <div className="ico">
              <Ic.Inbox size={34} />
            </div>
            <h2>Bir ileti seçin</h2>
            <p>
              Soldaki listeden bir maili açın; asistan müşteriyi, stoğu ve fiyatı Dia'dan otomatik analiz
              etsin.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mailview">
      <div className="mv-toolbar">
        <button
          className="mv-tool ghost mv-back"
          aria-label="Listeye dön"
          data-tooltip="Listeye dön"
          data-tooltip-align="left"
          onClick={onBack}
        >
          <Ic.ArrowLeft size={17} />
        </button>
        <button className="mv-tool ai" onClick={onReply}>
          <Ic.Sparkle size={15} /> AI ile Yanıtla
        </button>
        <span className="mv-div" />
        <button className="mv-tool" onClick={onReplyMail}>
          <Ic.Reply size={15} /> Yanıtla
        </button>
        <button className="mv-tool" onClick={onForward}>
          <Ic.Forward size={15} /> İlet
        </button>
        <div style={{ flex: 1 }} />
        <button
          className={`mv-tool ghost${flagged ? " flag-on" : ""}`}
          aria-label={flagged ? "Bayrağı kaldır" : "Bayrak ekle"}
          data-tooltip={flagged ? "Bayrağı kaldır" : "Bayrak ekle"}
          aria-pressed={flagged}
          onClick={onToggleFlag}
        >
          <Ic.Flag size={16} />
        </button>
        <button
          className="mv-tool ghost"
          aria-label={isUnread ? "Okundu olarak işaretle" : "Okunmadı olarak işaretle"}
          data-tooltip={isUnread ? "Okundu olarak işaretle" : "Okunmadı olarak işaretle"}
          onClick={onMarkUnread}
        >
          {isUnread ? <Ic.Mail size={16} /> : <Ic.MailOpen size={16} />}
        </button>
        {isArchived ? (
          <button
            className="mv-tool ghost"
            aria-label="Gelen Kutusuna Taşı"
            data-tooltip="Gelen Kutusuna Taşı"
            onClick={onRestoreToInbox ?? onArchive}
          >
            <Ic.Inbox size={16} />
          </button>
        ) : isTrash ? (
          <button
            className="mv-tool ghost"
            aria-label="Geri Yükle (Gelen Kutusuna Taşı)"
            data-tooltip="Geri Yükle (Gelen Kutusuna Taşı)"
            onClick={onRestoreToInbox}
          >
            <Ic.Inbox size={16} />
          </button>
        ) : (
          <button
            className="mv-tool ghost"
            aria-label="Arşivle"
            data-tooltip="Arşivle"
            onClick={onArchive}
          >
            <Ic.Archive size={16} />
          </button>
        )}
        <button
          className="mv-tool ghost"
          aria-label={isTrash ? "Kalıcı olarak sil" : "Sil"}
          data-tooltip={isTrash ? "Kalıcı olarak sil" : "Sil"}
          onClick={onDelete}
        >
          <Ic.Trash size={16} />
        </button>
        <span className="mv-div" />
        <button
          className={`mv-tool ghost ai-toggle${aiOpen ? " on" : ""}`}
          aria-label={aiOpen ? "AI Asistanını gizle" : "AI Asistanını aç"}
          data-tooltip={aiOpen ? "AI Asistanını gizle" : "AI Asistanını aç"}
          data-tooltip-align="right"
          aria-pressed={aiOpen}
          onClick={onToggleAi}
        >
          <Ic.Sparkle size={16} />
        </button>
      </div>
      <div className="mv-scroll scroll">
        <div className="mv-paper">
          <h1 className="mv-subject">{message.subject}</h1>
          {message.company ? <div className="mv-thread-cust">{message.company}</div> : null}
          {conversation && conversation.length > 0 ? (
            <div className="mv-thread">
              {conversation.map((m, i) => (
                <MessageBlock key={m.id} m={m} defaultOpen={i === conversation.length - 1} />
              ))}
            </div>
          ) : (
            <>
              <div className="mv-meta">
                <div className="mv-av" style={{ background: avatarFor(message.fromName) }}>
                  {initials(message.fromName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mv-from-line">
                    <span className="mv-from-name">{message.fromName}</span>
                    {message.role ? (
                      <Badge kind="neutral" sm>
                        {message.role}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mv-from-mail">
                    {message.fromEmail} · {message.company}
                  </div>
                  <div className="mv-to">Kime: {message.toAddress}</div>
                </div>
                <div className="mv-date">{message.date}</div>
              </div>
              <div className="mv-body">{message.bodyText}</div>
            </>
          )}
          {attachments && attachments.length > 0 ? (
            <div className="mv-attach">
              <div className="mv-attach-h">
                <Ic.File size={14} /> Ekler <span className="mv-attach-n">{attachments.length}</span>
              </div>
              <div className="mv-attach-list">
                {attachments.map((a) => (
                  <button
                    key={a.id}
                    className="attach-chip"
                    onClick={() => onDownload?.(a.id)}
                    title={`${a.name} — indir`}
                  >
                    <span className="ac-ic">
                      <Ic.File size={17} />
                    </span>
                    <span className="ac-meta">
                      <span className="ac-name">{a.name}</span>
                      <span className="ac-size">{formatBytes(a.size)}</span>
                    </span>
                    <span className="ac-dl">
                      <Ic.Download size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
