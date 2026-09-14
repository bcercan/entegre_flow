import { useEffect, useRef, useState, type FC } from "react";
import * as Ic from "@entegreflow/icons";
import type { IconProps } from "@entegreflow/icons";
import { formatBytes } from "./format";
import type { MailMessageView } from "./types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ComposeMode = "reply" | "forward" | "new";

/** Reply / Forward / brand-new email composer with a light rich-text editor. */
export function ComposeModal({
  mode,
  message,
  initial,
  sending,
  onClose,
  onSubmit,
  onSaveDraft,
}: {
  mode: ComposeMode;
  message?: MailMessageView | null;
  initial?: { to?: string; cc?: string; bcc?: string; subject?: string; html?: string };
  sending: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    text: string;
    html: string;
    files: File[];
  }) => void;
  onSaveDraft?: (payload: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    text: string;
    html: string;
  }) => void;
}) {
  const isReply = mode === "reply";
  const isNew = mode === "new";
  const [to, setTo] = useState(initial?.to ?? (isReply && message ? message.fromEmail : ""));
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [bcc, setBcc] = useState(initial?.bcc ?? "");
  const [showCc, setShowCc] = useState(Boolean(initial?.cc));
  const [showBcc, setShowBcc] = useState(Boolean(initial?.bcc));
  const [subjectInput, setSubjectInput] = useState(initial?.subject ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<() => void>(() => {});
  const SIGNATURE =
    '<br><br><div style="color:var(--text-3)">—<br>Entegre Safety · Satış<br>satis@entegresafety.com</div>';

  const derivedSubject = message
    ? isReply
      ? message.subject.startsWith("Re:")
        ? message.subject
        : `Re: ${message.subject}`
      : message.subject.startsWith("Fwd:")
        ? message.subject
        : `Fwd: ${message.subject}`
    : "";
  const subject = isNew ? subjectInput : derivedSubject;
  const title = isReply ? "Yanıtla" : isNew ? "Yeni Posta" : "İlet";

  useEffect(() => {
    // Draft edit restores its body; otherwise pre-fill a signature (except forward).
    if (editorRef.current) {
      editorRef.current.innerHTML = initial?.html ?? (mode !== "forward" ? SIGNATURE : "");
    }
    (isNew ? undefined : editorRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isNew, mode]);

  // execCommand is deprecated but universally supported — fine for a light editor.
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };
  const fmtBtn = (cmd: string, icon: FC<IconProps>, label: string, value?: string) => {
    const I = icon;
    return (
      <button
        type="button"
        className="fmt-btn"
        title={label}
        aria-label={label}
        onMouseDown={(e) => {
          e.preventDefault();
          exec(cmd, value);
        }}
      >
        <I size={16} />
      </button>
    );
  };

  const toValid = isReply || EMAIL_RE.test(to.trim());

  const submit = () => {
    const el = editorRef.current;
    const text = (el?.textContent ?? "").trim();
    const html = el?.innerHTML ?? "";
    if (!toValid || (!isReply && !isNew ? false : text.length === 0)) return;
    onSubmit({ to: to.trim(), cc: cc.trim(), bcc: bcc.trim(), subject: subject.trim(), text, html, files });
  };
  submitRef.current = submit;

  const saveDraft = () => {
    const el = editorRef.current;
    onSaveDraft?.({
      to: to.trim(),
      cc: cc.trim(),
      bcc: bcc.trim(),
      subject: subject.trim(),
      text: (el?.textContent ?? "").trim(),
      html: el?.innerHTML ?? "",
    });
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal compose"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="compose-cmd">
          <button className="cc-send" onClick={submit} disabled={sending || !toValid}>
            {sending ? <span className="spin" /> : <Ic.Send size={15} />}
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
          <button className="cc-tool" onClick={onClose} disabled={sending}>
            <Ic.Trash size={15} /> At
          </button>
          <button
            className="cc-tool"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Ic.File size={15} /> Ekle
          </button>
          {onSaveDraft ? (
            <button className="cc-tool" onClick={saveDraft} disabled={sending}>
              <Ic.Pen size={15} /> Taslak Kaydet
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length) setFiles((prev) => [...prev, ...picked]);
              e.target.value = "";
            }}
          />
          <div style={{ flex: 1 }} />
          <span className="cc-title">{title}</span>
          <button className="icon-btn" title="Kapat" aria-label="Kapat" onClick={onClose}>
            <Ic.X size={18} />
          </button>
        </div>

        <div className="compose-head">
          <div className="ch-row">
            <span className="ch-lab">Kaynak</span>
            <span className="ch-from">Entegre Safety · satis@entegresafety.com</span>
          </div>
          <div className="ch-row">
            <span className="ch-lab">Hedef</span>
            {isReply && message ? (
              <span className="ch-val">{message.fromEmail}</span>
            ) : (
              <input
                className="ch-input"
                type="email"
                placeholder="alici@ornek.com"
                aria-label="Alıcı e-posta"
                autoFocus={isNew}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            )}
            {isNew ? (
              <span className="ch-ccbcc">
                <button type="button" className={`ch-toggle${showCc ? " on" : ""}`} onClick={() => setShowCc((s) => !s)}>
                  Bilgi
                </button>
                <button type="button" className={`ch-toggle${showBcc ? " on" : ""}`} onClick={() => setShowBcc((s) => !s)}>
                  Gizli
                </button>
              </span>
            ) : null}
          </div>
          {isNew && showCc ? (
            <div className="ch-row">
              <span className="ch-lab">Bilgi</span>
              <input
                className="ch-input"
                type="text"
                placeholder="Cc — virgülle ayırın"
                aria-label="Bilgi (Cc)"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          ) : null}
          {isNew && showBcc ? (
            <div className="ch-row">
              <span className="ch-lab">Gizli</span>
              <input
                className="ch-input"
                type="text"
                placeholder="Bcc — virgülle ayırın"
                aria-label="Gizli (Bcc)"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
          ) : null}
          <div className="ch-row">
            <span className="ch-lab">Konu</span>
            {isNew ? (
              <input
                className="ch-input"
                type="text"
                placeholder="Konu"
                aria-label="Konu"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
              />
            ) : (
              <span className="ch-val">{subject}</span>
            )}
          </div>
        </div>

        <div className="compose-fmt" role="toolbar" aria-label="Biçimlendirme">
          {fmtBtn("undo", Ic.Refresh, "Geri al")}
          <span className="fmt-div" />
          {fmtBtn("bold", Ic.Bold, "Kalın")}
          {fmtBtn("italic", Ic.Italic, "İtalik")}
          {fmtBtn("underline", Ic.Underline, "Altı çizili")}
          <span className="fmt-div" />
          {fmtBtn("insertUnorderedList", Ic.List, "Madde işaretli liste")}
          {fmtBtn("insertOrderedList", Ic.ListNumbered, "Numaralı liste")}
          <span className="fmt-div" />
          <select
            className="fmt-size"
            aria-label="Yazı boyutu"
            defaultValue="3"
            onChange={(e) => exec("fontSize", e.target.value)}
          >
            <option value="2">Küçük</option>
            <option value="3">Normal</option>
            <option value="5">Büyük</option>
            <option value="6">Başlık</option>
          </select>
          {fmtBtn("removeFormat", Ic.X, "Biçimi temizle")}
        </div>

        {files.length ? (
          <div className="compose-atts">
            {files.map((f, i) => (
              <span className="ca-chip" key={`${f.name}-${i}`}>
                <Ic.File size={14} />
                <span className="ca-name">{f.name}</span>
                <span className="ca-size">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  className="ca-x"
                  aria-label={`${f.name} ekini kaldır`}
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Ic.X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div
          ref={editorRef}
          className="compose-body scroll"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="İleti gövdesi"
          data-ph={isReply ? "Yanıtınızı yazın…" : isNew ? "İletinizi yazın…" : "Not ekleyin (isteğe bağlı)…"}
        />

        {mode === "forward" && message ? (
          <div className="compose-quote">
            {message.fromName} · {message.fromEmail} tarafından gönderilen özgün ileti iletilecek.
          </div>
        ) : null}
      </div>
    </div>
  );
}
