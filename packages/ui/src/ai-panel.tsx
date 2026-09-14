import { useEffect, useRef, useState, type FC } from "react";
import * as Ic from "@entegreflow/icons";
import type { IconProps } from "@entegreflow/icons";
import type { AnalysisLine, Customer, MessageAnalysis, Warning } from "@entegreflow/contracts";
import { Badge } from "./components";
import { formatMoney, initials } from "./format";

function iconForSku(sku: string | null): FC<IconProps> {
  const map: Record<string, FC<IconProps>> = {
    BRT: Ic.helmet, ELD: Ic.glove, AYK: Ic.boot, YLK: Ic.vest,
    MSK: Ic.mask, KLK: Ic.ear, GZL: Ic.glasses, KMR: Ic.harness,
  };
  return map[(sku ?? "").slice(0, 3)] ?? Ic.Box;
}

function AIHead({ status, onCollapse }: { status: string; onCollapse?: () => void }) {
  return (
    <div className="ai-head">
      <div className="ai-orb">
        <Ic.Sparkle size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <h3>Yapay Zeka Asistanı</h3>
        <div className="sub" role="status" aria-live="polite">
          {status === "canlı" ? <span className="live-dot" /> : null}
          {status === "canlı" ? "Dia bağlı · gerçek zamanlı" : status}
        </div>
      </div>
      <button className="icon-btn" title="Asistan ayarları" aria-label="Asistan ayarları">
        <Ic.Settings size={16} />
      </button>
      {onCollapse ? (
        <button className="icon-btn" title="Paneli gizle" aria-label="Paneli gizle" onClick={onCollapse}>
          <Ic.ChevRight size={17} />
        </button>
      ) : null}
    </div>
  );
}

function Thinking({ step }: { step: string }) {
  return (
    <div className="card fade-in">
      <div className="thinking">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span>{step}</span>
      </div>
    </div>
  );
}

function Summary({ analysis }: { analysis: MessageAnalysis }) {
  const [explain, setExplain] = useState(false);
  const matched = analysis.lines.filter((l) => l.matchedSku).length;
  return (
    <div className="summary fade-in">
      <p className="lead">{analysis.summary}</p>
      <div className="intent-chips">
        {analysis.intents.map((it, i) => (
          <span className="intent" key={i}>
            <Ic.Sparkle size={12} /> {it}
          </span>
        ))}
      </div>
      <button className="explain-toggle" onClick={() => setExplain((e) => !e)} aria-expanded={explain}>
        <Ic.Sparkle size={12} /> Nasıl analiz edildi?
        <Ic.ChevDown size={13} className={`explain-chev${explain ? " open" : ""}`} />
      </button>
      {explain ? (
        <ul className="explain-list">
          <li>{analysis.intents.length} niyet ayrıştırıldı</li>
          <li>
            {matched}/{analysis.lines.length} kalem Dia kataloğuna eşlendi
          </li>
          <li>Stok ve birim fiyat Dia'dan gerçek zamanlı çekildi</li>
          <li>
            {analysis.warnings.length
              ? `${analysis.warnings.length} uyarı / risk hesaplandı`
              : "Risk taraması temiz"}
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const used = Math.min(
    100,
    Math.round((customer.balance.amountMinor / Math.max(1, customer.creditLimit.amountMinor)) * 100),
  );
  const fill = customer.overLimit ? "var(--danger)" : used > 80 ? "var(--warn)" : "var(--ok)";
  return (
    <div className="card">
      <div className="card-h">
        <span className="ic">
          <Ic.Database size={14} />
        </span>
        <span className="ttl">Müşteri · Dia Cari</span>
        <span className="right">
          <Badge kind="ok" icon={Ic.Check} sm>
            Senkron
          </Badge>
        </span>
      </div>
      <div className="card-b">
        <div className="cust-top">
          <div className="cust-av">{initials(customer.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cust-name">{customer.name}</div>
            <div className="cust-code">
              {customer.erpCode} · {customer.segment}
            </div>
          </div>
        </div>
        <div className="kv-grid">
          <div className="kv">
            <div className="k">Bakiye (Borç)</div>
            <div className="v">{formatMoney(customer.balance)}</div>
          </div>
          <div className="kv">
            <div className="k">Risk Limiti</div>
            <div className="v">{formatMoney(customer.creditLimit)}</div>
          </div>
          <div className="kv">
            <div className="k">Vade</div>
            <div className="v">{customer.paymentTerm ?? "—"}</div>
          </div>
          <div className="kv">
            <div className="k">Risk</div>
            <div className="v">{customer.risk.toUpperCase()}</div>
          </div>
        </div>
        <div className="risk-wrap">
          <div className="risk-labels">
            <span>Limit kullanımı</span>
            <span style={{ color: fill }}>
              {used}%{customer.overLimit ? " · AŞILDI" : ""}
            </span>
          </div>
          <div className="risk-bar">
            <div className="risk-fill" style={{ transform: `scaleX(${used / 100})`, background: fill }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LineTable({ lines }: { lines: AnalysisLine[] }) {
  const billable = lines.filter((l) => l.matchedSku && l.qty > 0);
  const total = billable.reduce((s, l) => s + l.qty * (l.deal?.amountMinor ?? 0), 0);
  const stockBadge = (l: AnalysisLine) => {
    if (l.qty === 0) return <Badge kind="neutral" sm>Liste</Badge>;
    if (l.stockState === "ok") return <Badge kind="ok" icon={Ic.Check} sm>{`Stokta ${l.stock}`}</Badge>;
    if (l.stockState === "low") return <Badge kind="warn" icon={Ic.Alert} sm>{`Kısmi ${l.stock}`}</Badge>;
    return <Badge kind="danger" icon={Ic.X} sm>Tükendi</Badge>;
  };
  return (
    <div className="card">
      <div className="card-h">
        <span className="ic">
          <Ic.Box size={14} />
        </span>
        <span className="ttl">Talep Edilen Ürünler · Dia Stok</span>
        <span className="right">
          <Badge kind="neutral" sm>{`${lines.length} kalem`}</Badge>
        </span>
      </div>
      <div className="linetable">
        {lines.map((l, i) => {
          const PI = iconForSku(l.matchedSku);
          const discounted = l.deal && l.list && l.deal.amountMinor < l.list.amountMinor;
          return (
            <div className="lt-row" key={i}>
              <div className="lt-main">
                <div className="lt-thumb">
                  <PI size={20} />
                </div>
                <div className="lt-info">
                  <div className="lt-name">{l.name}</div>
                  <div className="lt-sku">{l.matchedSku ?? "eşleşmedi"}</div>
                </div>
                <div className="lt-qty">
                  {l.qty > 0 ? (
                    <>
                      <span className="n">{l.qty}</span> <span className="u">{l.unit}</span>
                    </>
                  ) : (
                    <span className="u">—</span>
                  )}
                </div>
              </div>
              <div className="lt-pricing">
                <span className="lt-stock">{stockBadge(l)}</span>
                <span className="lt-price">
                  {discounted ? (
                    <>
                      <s>{formatMoney(l.list)}</s>
                      <Ic.ChevRight size={12} />
                      <b className="deal">{formatMoney(l.deal)}</b>
                    </>
                  ) : (
                    <b>{formatMoney(l.list ?? l.deal)}</b>
                  )}
                  <span className="u">/ {l.unit}</span>
                </span>
                {l.qty > 0 ? (
                  <span className="lt-total">
                    {formatMoney({ amountMinor: l.qty * (l.deal?.amountMinor ?? 0), currency: "TRY" })}
                  </span>
                ) : null}
              </div>
              {l.note ? (
                <div className="lt-alt">
                  <Ic.Refresh size={13} />
                  <span>{l.note}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {total > 0 ? (
        <div className="lt-foot">
          <span className="lab">Tahmini teklif tutarı (KDV hariç)</span>
          <span className="tot">{formatMoney({ amountMinor: total, currency: "TRY" })}</span>
        </div>
      ) : null}
    </div>
  );
}

function Warnings({ warnings }: { warnings: Warning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="card">
      <div className="card-h">
        <span className="ic">
          <Ic.Alert size={14} />
        </span>
        <span className="ttl">Asistan Uyarıları</span>
        <span className="right">
          <Badge kind="warn" sm>{warnings.length}</Badge>
        </span>
      </div>
      <div className="card-b">
        {warnings.map((w, i) => {
          const I = w.type === "danger" ? Ic.Alert : Ic.Info;
          return (
            <div className={`alert ${w.type}`} key={i}>
              <div className="ai-ic">
                <I size={14} />
              </div>
              <div>
                <div className="ttl">{w.title}</div>
                <div className="desc">{w.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftBlock({
  analysis,
  customer,
  recipientEmail,
  sending,
  onSend,
  onRegen,
}: {
  analysis: MessageAnalysis;
  customer: Customer | null;
  recipientEmail: string;
  sending: boolean;
  onSend: () => void;
  onRegen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysis.draftText);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [ack, setAck] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const billable = analysis.lines.filter((l) => l.matchedSku && l.qty > 0);
  const total = billable.reduce((s, l) => s + l.qty * (l.deal?.amountMinor ?? 0), 0);
  const parts = draft.split("[TEKLİF TABLOSU]");
  const risky = (customer?.overLimit ?? false) || analysis.warnings.some((w) => w.type === "danger");
  const riskLabel = customer?.overLimit ? "Müşteri risk limitini aştı" : "Kritik uyarı mevcut";
  const dirty = draft !== analysis.draftText; // unsaved manual edits
  const sendable = total > 0; // nothing billable → nothing to send

  // Move focus into the confirmation so screen-reader + keyboard users land on it.
  useEffect(() => {
    if (confirming) headingRef.current?.focus();
  }, [confirming]);

  const onRegenClick = () => (dirty ? setConfirmRegen(true) : onRegen());

  return (
    <div className="draft">
      <div className="draft-h">
        <Ic.Pen size={14} style={{ color: "var(--ai)" }} />
        <span className="ttl">AI Cevap Taslağı</span>
        <span className="right">
          <button className="mini-btn" onClick={() => setEditing((e) => !e)}>
            <Ic.Edit size={12} /> {editing ? "Önizle" : "Düzenle"}
          </button>
          <button
            className="mini-btn"
            onClick={() => {
              navigator.clipboard?.writeText(draft);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            <Ic.Copy size={12} /> {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </span>
      </div>
      <div className="draft-body">
        {editing ? (
          <textarea className="draft-text edit" value={draft} onChange={(e) => setDraft(e.target.value)} />
        ) : (
          <>
            <div className="draft-text">{parts[0]}</div>
            {billable.length > 0 ? (
              <div className="draft-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th className="r">Adet</th>
                      <th className="r">Br. Fiyat</th>
                      <th className="r">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billable.map((l, i) => (
                      <tr key={i}>
                        <td>{l.name}</td>
                        <td className="r">
                          {l.qty} {l.unit}
                        </td>
                        <td className="r">{formatMoney(l.deal)}</td>
                        <td className="r">
                          {formatMoney({ amountMinor: l.qty * (l.deal?.amountMinor ?? 0), currency: "TRY" })}
                        </td>
                      </tr>
                    ))}
                    <tr className="tot">
                      <td colSpan={3}>Genel Toplam (KDV hariç)</td>
                      <td className="r">{formatMoney({ amountMinor: total, currency: "TRY" })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="draft-text">{parts[1]}</div>
          </>
        )}
      </div>
      {confirming ? (
        <div className="send-confirm" role="group" aria-labelledby="sc-heading" aria-live="polite">
          <div className="sc-title" id="sc-heading" ref={headingRef} tabIndex={-1}>
            Teklifi göndermeyi onayla
          </div>
          <div className="sc-row">
            <span>Alıcı</span>
            <b>{recipientEmail || "—"}</b>
          </div>
          <div className="sc-row">
            <span>Tahmini tutar (KDV hariç)</span>
            <b>{formatMoney({ amountMinor: total, currency: "TRY" })}</b>
          </div>
          {risky ? (
            <label className="sc-risk">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                aria-describedby="sc-risk-reason"
              />
              <span id="sc-risk-reason">
                <b>{riskLabel}.</b> Yine de göndermeyi onaylıyorum.
              </span>
            </label>
          ) : null}
          {!sendable ? (
            <div className="sc-note">Gönderilebilir kalem yok — teklif tutarı ₺0.</div>
          ) : null}
          <div className="sc-actions">
            <button
              className="btn ghost"
              disabled={sending}
              onClick={() => {
                setConfirming(false);
                setAck(false);
              }}
            >
              Vazgeç
            </button>
            <button
              className="btn ai"
              disabled={sending || !sendable || (risky && !ack)}
              onClick={onSend}
            >
              {sending ? <span className="spin" /> : <Ic.Send size={15} />}
              {sending ? "Gönderiliyor…" : "Teklifi gönder"}
            </button>
          </div>
        </div>
      ) : confirmRegen ? (
        <div className="send-confirm" role="group" aria-live="polite">
          <div className="sc-warn">
            <Ic.Alert size={15} />
            <span>Taslakta yaptığın düzenlemeler silinecek. Yine de yeniden oluşturulsun mu?</span>
          </div>
          <div className="sc-actions">
            <button className="btn ghost" onClick={() => setConfirmRegen(false)}>
              Vazgeç
            </button>
            <button
              className="btn ai"
              onClick={() => {
                setConfirmRegen(false);
                onRegen();
              }}
            >
              <Ic.Refresh size={15} /> Yine de yenile
            </button>
          </div>
        </div>
      ) : (
        <div className="draft-foot">
          <button className="btn ghost" onClick={onRegenClick}>
            <Ic.Refresh size={15} /> Yeniden oluştur
          </button>
          <button className="btn ai" onClick={() => setConfirming(true)}>
            <Ic.Send size={15} /> Onayla ve Gönder
          </button>
        </div>
      )}
    </div>
  );
}

function SentCard({ number, recipientEmail }: { number: string; recipientEmail: string }) {
  return (
    <div className="sent-card fade-in">
      <div className="sent-ic">
        <Ic.Check size={22} />
      </div>
      <div className="sent-body">
        <div className="sent-ttl">Teklif gönderildi</div>
        <div className="sent-meta">
          <b>{number}</b>
          {recipientEmail ? ` · ${recipientEmail}` : ""}
        </div>
      </div>
    </div>
  );
}

export function AIPanel({
  analysis,
  customer,
  phase,
  sending,
  sent,
  recipientEmail,
  draftKey,
  onSend,
  onRegen,
  onRetry,
  onCollapse,
}: {
  analysis: MessageAnalysis | null;
  customer: Customer | null;
  phase: "idle" | "analyzing" | "done" | "error";
  sending: boolean;
  sent: { number: string } | null;
  recipientEmail: string;
  draftKey: number;
  onSend: () => void;
  onRegen: () => void;
  onRetry: () => void;
  onCollapse?: () => void;
}) {
  if (phase === "idle") {
    return (
      <aside className="aipanel">
        <AIHead status="bekleniyor" onCollapse={onCollapse} />
        <div
          className="ai-scroll scroll"
          style={{ alignItems: "center", justifyContent: "center", color: "var(--text-3)", textAlign: "center" }}
        >
          <Ic.Sparkle size={34} style={{ color: "var(--ai)", opacity: 0.5 }} />
          <div style={{ fontSize: 13, maxWidth: 220 }}>
            Asistan hazır. Bir mail seçip “AI ile Yanıtla”ya basın.
          </div>
        </div>
      </aside>
    );
  }

  if (phase === "error") {
    return (
      <aside className="aipanel">
        <AIHead status="bağlantı hatası" onCollapse={onCollapse} />
        <div
          className="ai-scroll scroll"
          style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
        >
          <div className="ai-error">
            <div className="ai-error-ic">
              <Ic.Alert size={22} />
            </div>
            <div className="ai-error-ttl">Analiz tamamlanamadı</div>
            <div className="ai-error-desc">
              Analiz sırasında bir sorun oluştu. Bağlantıyı kontrol edip tekrar deneyin.
            </div>
            <button className="btn ai" onClick={onRetry} style={{ flex: "none" }}>
              <Ic.Refresh size={15} /> Yeniden dene
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="aipanel">
      <AIHead status="canlı" onCollapse={onCollapse} />
      <div className="ai-scroll scroll">
        {phase === "analyzing" || !analysis ? (
          <>
            <Thinking step="Mail analiz ediliyor, Dia'dan stok ve fiyat çekiliyor…" />
            <div className="card" style={{ padding: 14 }}>
              <div className="skel" style={{ height: 13, width: "90%", marginBottom: 9 }} />
              <div className="skel" style={{ height: 13, width: "72%", marginBottom: 16 }} />
              <div className="skel" style={{ height: 44, width: "100%", marginBottom: 9 }} />
              <div className="skel" style={{ height: 44, width: "100%" }} />
            </div>
          </>
        ) : (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
            <Summary analysis={analysis} />
            {customer ? <CustomerCard customer={customer} /> : null}
            <LineTable lines={analysis.lines} />
            <Warnings warnings={analysis.warnings} />
            {sent ? (
              <SentCard number={sent.number} recipientEmail={recipientEmail} />
            ) : (
              <DraftBlock
                key={draftKey}
                analysis={analysis}
                customer={customer}
                recipientEmail={recipientEmail}
                sending={sending}
                onSend={onSend}
                onRegen={onRegen}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
