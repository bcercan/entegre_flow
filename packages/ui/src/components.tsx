import type { FC, ReactNode } from "react";
import * as Ic from "@entegreflow/icons";
import type { IconProps } from "@entegreflow/icons";
import type { AiStatus } from "@entegreflow/contracts";
import { avatarFor, initials } from "./format";
import type { InboxItem, MailMessageView } from "./types";

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

export function TopBar({ userInitials = "EÇ" }: { userInitials?: string }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Ic.Shield size={17} />
        </div>
        <div>
          <div className="brand-name">
            Entegre<span>Flow</span>
          </div>
          <div className="brand-sub">AI Satış Asistanı · Dia entegre</div>
        </div>
      </div>
      <label className="search">
        <Ic.Search size={16} />
        <input placeholder="Mail, müşteri veya ürün ara…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="topbar-spacer" />
      <div className="top-actions">
        <button className="icon-btn" title="Bildirimler">
          <Ic.Bell size={18} />
        </button>
        <button className="icon-btn" title="Ayarlar">
          <Ic.Settings size={18} />
        </button>
        <div className="avatar" title="Satış Temsilcisi">
          {userInitials}
        </div>
      </div>
    </header>
  );
}

export type Folder = "ai" | "inbox" | "answered" | "other";

export function NavRail({
  folder,
  setFolder,
  counts,
}: {
  folder: Folder;
  setFolder: (f: Folder) => void;
  counts: { ai: number; inbox: number };
}) {
  const items: Array<{ id: Folder; label: string; icon: FC<IconProps>; badge?: number; ai?: boolean }> = [
    { id: "ai", label: "AI Kutusu", icon: Ic.Sparkle, badge: counts.ai, ai: true },
    { id: "inbox", label: "Gelen", icon: Ic.Inbox, badge: counts.inbox },
    { id: "answered", label: "Yanıtlanan", icon: Ic.CheckCircle },
    { id: "other", label: "Diğer", icon: Ic.Archive },
  ];
  return (
    <nav className="rail">
      {items.map((it) => {
        const I = it.icon;
        return (
          <button
            key={it.id}
            className={`rail-item${folder === it.id ? " active" : ""}`}
            onClick={() => setFolder(it.id)}
          >
            {it.badge ? <span className={`rail-badge${it.ai ? " ai" : ""}`}>{it.badge}</span> : null}
            <I size={20} />
            <span className="rl-label">{it.label}</span>
          </button>
        );
      })}
      <div className="rail-spacer" />
      <button className="rail-item">
        <Ic.Truck size={20} />
        <span className="rl-label">Siparişler</span>
      </button>
      <button className="rail-item">
        <Ic.Database size={20} />
        <span className="rl-label">Dia</span>
      </button>
    </nav>
  );
}

function MailRow({
  item,
  active,
  onClick,
}: {
  item: InboxItem;
  active: boolean;
  onClick: () => void;
}) {
  const st = STATUS[item.aiStatus];
  return (
    <button className={`mailrow ${item.unread ? "" : "read"}${active ? " active" : ""}`} onClick={onClick}>
      <div className="mr-top">
        {item.unread ? <span className="mr-unread" /> : null}
        <span className="mr-from">{item.from}</span>
        <span className="mr-time">{item.time}</span>
      </div>
      <div className="mr-subject">{item.subject}</div>
      <div className="mr-preview">{item.preview}</div>
      <div className="mr-tags">
        {st ? (
          <Badge kind={st.kind} icon={st.icon} sm>
            {st.label}
          </Badge>
        ) : null}
        <span className="mr-company">{item.company}</span>
      </div>
    </button>
  );
}

export function MailList({
  items,
  title,
  selectedId,
  onSelect,
}: {
  items: InboxItem[];
  title: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="maillist">
      <div className="ml-head">
        <div className="ml-title-row">
          <span className="ml-title">{title}</span>
          <span className="ml-count">{items.length} ileti</span>
        </div>
        <div className="ml-tabs">
          <button className="ml-tab active">
            <Ic.Filter size={12} /> Önceliğe göre
          </button>
          <button className="ml-tab">Tarihe göre</button>
        </div>
      </div>
      <div className="ml-rows scroll">
        {items.map((it) => (
          <MailRow key={it.id} item={it} active={it.id === selectedId} onClick={() => onSelect(it.id)} />
        ))}
        {items.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            Bu klasörde ileti yok.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MailView({
  message,
  onReply,
}: {
  message: MailMessageView | null;
  onReply: () => void;
}) {
  if (!message) {
    return (
      <div className="mailview">
        <div className="mv-empty">
          <div className="inner">
            <Ic.Inbox size={46} />
            <div style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 15 }}>Bir ileti seçin</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Soldaki listeden bir maili açın, asistan otomatik analiz etsin.
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mailview">
      <div className="mv-toolbar">
        <button className="mv-tool primary" onClick={onReply}>
          <Ic.Sparkle size={15} /> AI ile Yanıtla
        </button>
        <button className="mv-tool">
          <Ic.Reply size={14} /> Yanıtla
        </button>
        <button className="mv-tool">
          <Ic.Forward size={14} /> İlet
        </button>
        <div style={{ flex: 1 }} />
        <button className="mv-tool ghost" title="Arşivle">
          <Ic.Archive size={15} />
        </button>
        <button className="mv-tool ghost" title="Sil">
          <Ic.Trash size={15} />
        </button>
      </div>
      <div className="mv-scroll scroll">
        <div className="mv-paper">
          <h1 className="mv-subject">{message.subject}</h1>
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
        </div>
      </div>
    </div>
  );
}
