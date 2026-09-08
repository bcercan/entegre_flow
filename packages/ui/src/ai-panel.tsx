import { useState, type FC } from "react";
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

function AIHead({ status }: { status: string }) {
  return (
    <div className="ai-head">
      <div className="ai-orb">
        <Ic.Sparkle size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <h3>Yapay Zeka Asistanı</h3>
        <div className="sub">
          {status === "canlı" ? <span className="live-dot" /> : null}
          {status === "canlı" ? "Dia bağlı · gerçek zamanlı" : status}
        </div>
      </div>
      <button className="icon-btn" title="Asistan ayarları">
        <Ic.Settings size={16} />
      </button>
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
            <div className="risk-fill" style={{ width: `${used}%`, background: fill }} />
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
  onSend,
  onRegen,
}: {
  analysis: MessageAnalysis;
  onSend: () => void;
  onRegen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysis.draftText);
  const [copied, setCopied] = useState(false);
  const billable = analysis.lines.filter((l) => l.matchedSku && l.qty > 0);
  const total = billable.reduce((s, l) => s + l.qty * (l.deal?.amountMinor ?? 0), 0);
  const parts = draft.split("[TEKLİF TABLOSU]");

  return (
    <div className="draft">
      <div className="draft-h">
        <Ic.Pen size={14} style={{ color: "var(--accent-ink)" }} />
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
      <div className="draft-foot">
        <button className="btn ghost" onClick={onRegen}>
          <Ic.Refresh size={15} /> Yeniden oluştur
        </button>
        <button className="btn primary" onClick={onSend}>
          <Ic.Send size={15} /> Onayla ve Gönder
        </button>
      </div>
    </div>
  );
}

export function AIPanel({
  analysis,
  customer,
  phase,
  onSend,
  onRegen,
}: {
  analysis: MessageAnalysis | null;
  customer: Customer | null;
  phase: "idle" | "analyzing" | "done";
  onSend: () => void;
  onRegen: () => void;
}) {
  if (phase === "idle") {
    return (
      <aside className="aipanel">
        <AIHead status="bekleniyor" />
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

  return (
    <aside className="aipanel">
      <AIHead status="canlı" />
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
            <DraftBlock analysis={analysis} onSend={onSend} onRegen={onRegen} />
          </div>
        )}
      </div>
    </aside>
  );
}
