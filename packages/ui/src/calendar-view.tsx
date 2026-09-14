import { useState, useMemo, useEffect } from "react";
import * as Ic from "@entegreflow/icons";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: "work" | "visit" | "meeting" | "reminder";
  location?: string;
  description?: string;
  customer?: string;
}

const CATEGORY_STYLES: Record<CalendarEvent["category"], { label: string; color: string; bg: string; border: string }> = {
  work: {
    label: "İş & Sipariş",
    color: "var(--accent)",
    bg: "color-mix(in srgb, var(--accent) 15%, transparent)",
    border: "var(--accent)",
  },
  visit: {
    label: "Saha Ziyareti",
    color: "#107c41", // Outlook Excel / green
    bg: "color-mix(in srgb, #107c41 15%, transparent)",
    border: "#107c41",
  },
  meeting: {
    label: "Toplantı",
    color: "#d83b01", // Outlook orange/red
    bg: "color-mix(in srgb, #d83b01 15%, transparent)",
    border: "#d83b01",
  },
  reminder: {
    label: "Hatırlatıcı",
    color: "#8764b8", // Outlook purple
    bg: "color-mix(in srgb, #8764b8 15%, transparent)",
    border: "#8764b8",
  },
};

const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Akça İnşaat · Şantiye KKD Numune Teslimi",
    date: "2026-09-11",
    startTime: "09:30",
    endTime: "10:45",
    category: "visit",
    location: "Tuzla Şantiye Sahası",
    customer: "Akça İnşaat A.Ş.",
    description: "Baret ve S3 iş ayakkabısı numunelerinin şantiye şefine elden teslimi ve beden kontrolleri.",
  },
  {
    id: "evt-2",
    title: "Dia ERP · Otomatik Fiyat & Stok Senkronizasyonu",
    date: "2026-09-11",
    startTime: "14:00",
    endTime: "15:00",
    category: "work",
    location: "Online (Teams)",
    description: "Dia entegrasyon servisi üzerinde yeni iskonto matrislerinin ve stok eşiklerinin canlı testi.",
  },
  {
    id: "evt-3",
    title: "Haftalık Satış & Teklif Değerlendirmesi",
    date: "2026-09-11",
    startTime: "16:30",
    endTime: "17:15",
    category: "meeting",
    location: "Toplantı Odası 2",
    description: "Haftalık onaylanan teklifler, bekleyen limit aşımları ve açık taleplerin gözden geçirilmesi.",
  },
  {
    id: "evt-4",
    title: "Mavi Tersane · Risk & Limit Değerlendirme Görüşmesi",
    date: "2026-09-12",
    startTime: "11:00",
    endTime: "12:00",
    category: "meeting",
    location: "Mavi Tersane Genel Merkez",
    customer: "Mavi Tersane San. Ltd.",
    description: "Finans birimi ile 472.000 TL bakiye ve 450.000 TL limit durumu için ek teminat veya peşinat görüşmesi.",
  },
  {
    id: "evt-5",
    title: "Demir Yapı · KKD Baret & Eldiven Sipariş Onayı",
    date: "2026-09-10",
    startTime: "10:30",
    endTime: "11:30",
    category: "work",
    location: "Telefon Görüşmesi",
    customer: "Demir Yapı Taahhüt Ltd.",
    description: "Hazırlanan teklifin müşteri tarafından teyidi ve sevkiyat planlaması.",
  },
];

const STORAGE_KEY = "ef_calendar_events";

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_NAMES_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const SHORT_DAY_NAMES_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MONTH_NAMES_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function CalendarSidebar({
  selectedDate,
  onSelectDate,
  onNewEvent,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onNewEvent: () => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  // Monday start: 0 = Mon, ..., 6 = Sun
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = useMemo(() => {
    const list: Array<{ day: number; currentMonth: boolean; date: Date }> = [];
    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      list.push({ day: d, currentMonth: false, date: new Date(year, month - 1, d) });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
    }
    // Next month padding
    const remaining = (7 - (list.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      list.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
    }
    return list;
  }, [year, month, startDay, daysInMonth, prevMonthDays]);

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const isSelected = (d: Date) => {
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  };

  return (
    <div className="cal-sidebar">
      <button className="compose-btn" onClick={onNewEvent}>
        <Ic.Plus size={16} /> Yeni Etkinlik
      </button>

      {/* Mini Monthly Picker */}
      <div className="mini-cal">
        <div className="mini-cal-header">
          <span className="mini-cal-title">
            {MONTH_NAMES_TR[month]} {year}
          </span>
          <div className="mini-cal-nav">
            <button
              type="button"
              className="mini-cal-btn"
              title="Önceki ay"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
            >
              <Ic.ChevUp size={14} style={{ transform: "rotate(-90deg)" }} />
            </button>
            <button
              type="button"
              className="mini-cal-btn"
              title="Sonraki ay"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
            >
              <Ic.ChevUp size={14} style={{ transform: "rotate(90deg)" }} />
            </button>
          </div>
        </div>

        <div className="mini-cal-weekdays">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="mini-cal-grid">
          {cells.map((c, i) => {
            const today = isToday(c.date);
            const selected = isSelected(c.date);
            return (
              <button
                key={i}
                type="button"
                className={`mini-cal-day${c.currentMonth ? "" : " muted"}${today ? " today" : ""}${selected ? " selected" : ""}`}
                onClick={() => onSelectDate(c.date)}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* My Calendars list */}
      <div className="cal-categories">
        <div className="cal-sec-title">Takvimlerim</div>
        <label className="cal-cat-item">
          <input type="checkbox" defaultChecked />
          <span className="cat-dot" style={{ background: "var(--accent)" }} />
          <span>İş &amp; Sipariş</span>
        </label>
        <label className="cal-cat-item">
          <input type="checkbox" defaultChecked />
          <span className="cat-dot" style={{ background: "#107c41" }} />
          <span>Saha Ziyaretleri</span>
        </label>
        <label className="cal-cat-item">
          <input type="checkbox" defaultChecked />
          <span className="cat-dot" style={{ background: "#d83b01" }} />
          <span>Toplantılar</span>
        </label>
        <label className="cal-cat-item">
          <input type="checkbox" defaultChecked />
          <span className="cat-dot" style={{ background: "#8764b8" }} />
          <span>Hatırlatıcılar</span>
        </label>
      </div>
    </div>
  );
}

export function CalendarView({
  selectedDate,
  onSelectDate,
  onComposeMail,
  newEventOpen: externalNewEventOpen,
  onCloseNewEvent,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onComposeMail?: (to?: string, subject?: string) => void;
  newEventOpen?: boolean;
  onCloseNewEvent?: () => void;
}) {
  const [viewMode, setViewMode] = useState<"week" | "workWeek" | "day" | "month">("week");
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === "undefined") return DEFAULT_EVENTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_EVENTS;
    } catch {
      return DEFAULT_EVENTS;
    }
  });

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [internalNewEventOpen, setInternalNewEventOpen] = useState(false);
  const isNewEventOpen = externalNewEventOpen || internalNewEventOpen;

  const closeNewEventModal = () => {
    setInternalNewEventOpen(false);
    onCloseNewEvent?.();
  };

  const [newDraft, setNewDraft] = useState<Partial<CalendarEvent>>({
    title: "",
    date: formatISODate(selectedDate),
    startTime: "10:00",
    endTime: "11:00",
    category: "work",
    location: "",
    description: "",
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [undoEvent, setUndoEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg(null);
      setUndoEvent(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraft.title?.trim()) return;
    const evt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newDraft.title.trim(),
      date: newDraft.date || formatISODate(selectedDate),
      startTime: newDraft.startTime || "10:00",
      endTime: newDraft.endTime || "11:00",
      category: newDraft.category || "work",
      location: newDraft.location?.trim(),
      description: newDraft.description?.trim(),
    };
    setEvents((prev) => {
      const next = [...prev, evt];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    closeNewEventModal();
    setToastMsg("Etkinlik takvime eklendi");
    setNewDraft({
      title: "",
      date: formatISODate(selectedDate),
      startTime: "10:00",
      endTime: "11:00",
      category: "work",
      location: "",
      description: "",
    });
  };

  const handleDeleteEvent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setEvents((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        setUndoEvent(target);
      }
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveEvent(null);
    setToastMsg("Etkinlik silindi");
  };

  const handleUndoDelete = () => {
    if (!undoEvent) return;
    setEvents((prev) => {
      const next = [...prev, undoEvent];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setUndoEvent(null);
    setToastMsg("Etkinlik geri yüklendi");
  };

  // Keyboard shortcut to delete active event when modal is open
  useEffect(() => {
    if (!activeEvent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) {
        e.preventDefault();
        handleDeleteEvent(activeEvent.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeEvent]);

  // Week calculation (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const day = (curr.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day);

    const count = viewMode === "workWeek" ? 5 : viewMode === "day" ? 1 : 7;
    const days: Date[] = [];
    if (viewMode === "day") {
      days.push(new Date(selectedDate));
    } else {
      for (let i = 0; i < count; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
    }
    return days;
  }, [selectedDate, viewMode]);

  const navStep = (direction: -1 | 1) => {
    const next = new Date(selectedDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() + direction);
    } else if (viewMode === "month") {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setDate(next.getDate() + direction * 7);
    }
    onSelectDate(next);
  };

  const goToday = () => {
    onSelectDate(new Date());
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Current date banner title
  const bannerTitle = useMemo(() => {
    if (viewMode === "day") {
      return `${selectedDate.getDate()} ${MONTH_NAMES_TR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}, ${DAY_NAMES_TR[selectedDate.getDay()]}`;
    }
    if (viewMode === "month") {
      return `${MONTH_NAMES_TR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    const first = currentWeekDays[0];
    const last = currentWeekDays[currentWeekDays.length - 1];
    if (!first || !last) return "";
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES_TR[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTH_NAMES_TR[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES_TR[last.getMonth()]} ${last.getFullYear()}`;
  }, [selectedDate, viewMode, currentWeekDays]);

  return (
    <div className="cal-main">
      {/* Top Header / Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-tb-left">
          <button type="button" className="cal-btn-today" onClick={goToday}>
            Bugün
          </button>
          <div className="cal-nav-arrows">
            <button
              type="button"
              className="cal-arrow-btn"
              title="Önceki"
              onClick={() => navStep(-1)}
            >
              <Ic.ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="cal-arrow-btn"
              title="Sonraki"
              onClick={() => navStep(1)}
            >
              <Ic.ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>
          <h2 className="cal-title">{bannerTitle}</h2>
        </div>

        <div className="cal-tb-right">
          <div className="cal-segmented">
            <button
              type="button"
              className={`cal-seg-btn${viewMode === "day" ? " active" : ""}`}
              onClick={() => setViewMode("day")}
            >
              Gün
            </button>
            <button
              type="button"
              className={`cal-seg-btn${viewMode === "workWeek" ? " active" : ""}`}
              onClick={() => setViewMode("workWeek")}
            >
              İş Haftası
            </button>
            <button
              type="button"
              className={`cal-seg-btn${viewMode === "week" ? " active" : ""}`}
              onClick={() => setViewMode("week")}
            >
              Hafta
            </button>
            <button
              type="button"
              className={`cal-seg-btn${viewMode === "month" ? " active" : ""}`}
              onClick={() => setViewMode("month")}
            >
              Ay
            </button>
          </div>

          <button
            type="button"
            className="btn primary cal-new-event-btn"
            onClick={() => {
              setNewDraft((prev) => ({ ...prev, date: formatISODate(selectedDate) }));
              setInternalNewEventOpen(true);
            }}
          >
            <Ic.Plus size={15} /> Yeni Etkinlik
          </button>
        </div>
      </div>

      {/* Week / Work-Week / Day Grid */}
      {viewMode !== "month" ? (
        <div className="cal-grid-wrap scroll">
          {/* Header row with dates */}
          <div className="cal-grid-header">
            <div className="cal-time-col-header" />
            <div
              className="cal-days-header"
              style={{
                gridTemplateColumns: `repeat(${currentWeekDays.length}, 1fr)`,
              }}
            >
              {currentWeekDays.map((d) => {
                const today = isToday(d);
                return (
                  <div key={d.toISOString()} className={`cal-day-header${today ? " today" : ""}`}>
                    <span className="cal-day-name">{SHORT_DAY_NAMES_TR[(d.getDay() + 6) % 7]}</span>
                    <span className={`cal-day-num${today ? " today" : ""}`}>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time and Day columns */}
          <div className="cal-grid-body">
            {/* Time labels column */}
            <div className="cal-time-col">
              {HOURS.map((h) => (
                <div key={h} className="cal-time-slot-label">
                  <span>{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div
              className="cal-day-cols"
              style={{
                gridTemplateColumns: `repeat(${currentWeekDays.length}, 1fr)`,
              }}
            >
              {currentWeekDays.map((dayDate) => {
                const isoDate = formatISODate(dayDate);
                const dayEvents = events.filter((e) => e.date === isoDate);
                const today = isToday(dayDate);

                return (
                  <div
                    key={isoDate}
                    className={`cal-day-column${today ? " today" : ""}`}
                    onClick={(e) => {
                      // Click on empty space creates event at clicked hour
                      if ((e.target as HTMLElement).closest(".cal-event-card")) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const hourIndex = Math.min(
                        HOURS.length - 1,
                        Math.max(0, Math.floor(y / 56))
                      );
                      const startH = HOURS[hourIndex] ?? 9;
                      setNewDraft({
                        title: "",
                        date: isoDate,
                        startTime: `${String(startH).padStart(2, "0")}:00`,
                        endTime: `${String(startH + 1).padStart(2, "0")}:00`,
                        category: "work",
                        location: "",
                        description: "",
                      });
                      setInternalNewEventOpen(true);
                    }}
                  >
                    {/* Hour rows */}
                    {HOURS.map((h) => (
                      <div key={h} className="cal-hour-row" />
                    ))}

                    {/* Events */}
                    {dayEvents.map((evt) => {
                      const [sh = 9, sm = 0] = evt.startTime.split(":").map(Number);
                      const [eh = 10, em = 0] = evt.endTime.split(":").map(Number);
                      const startMinutes = (sh - 8) * 60 + sm;
                      const durationMinutes = Math.max(30, (eh - sh) * 60 + (em - sm));

                      // 56px per 60 minutes
                      const topPx = (startMinutes / 60) * 56;
                      const heightPx = Math.max(26, (durationMinutes / 60) * 56 - 2);

                      const cat = CATEGORY_STYLES[evt.category] || CATEGORY_STYLES.work;

                      return (
                        <div
                          key={evt.id}
                          className="cal-event-card"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            background: cat.bg,
                            borderLeft: `3px solid ${cat.border}`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEvent(evt);
                          }}
                        >
                          <div className="cal-evt-title" style={{ color: "var(--text)" }}>
                            {evt.title}
                          </div>
                          <div className="cal-evt-time">
                            {evt.startTime} – {evt.endTime}
                            {evt.location ? ` · ${evt.location}` : ""}
                          </div>
                          <button
                            type="button"
                            className="cal-card-del-btn"
                            title="Etkinliği Sil"
                            aria-label="Etkinliği Sil"
                            onClick={(e) => handleDeleteEvent(evt.id, e)}
                          >
                            <Ic.Trash size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Month View Grid */
        <div className="cal-month-wrap scroll">
          <div className="cal-month-header">
            {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].map((w) => (
              <div key={w} className="cal-month-col-head">
                {w}
              </div>
            ))}
          </div>
          <div className="cal-month-grid">
            {(() => {
              const y = selectedDate.getFullYear();
              const m = selectedDate.getMonth();
              const startDay = (new Date(y, m, 1).getDay() + 6) % 7;
              const daysInMonth = new Date(y, m + 1, 0).getDate();
              const prevDays = new Date(y, m, 0).getDate();
              const list: Array<{ day: number; date: Date; current: boolean }> = [];
              for (let i = startDay - 1; i >= 0; i--) {
                list.push({ day: prevDays - i, date: new Date(y, m - 1, prevDays - i), current: false });
              }
              for (let d = 1; d <= daysInMonth; d++) {
                list.push({ day: d, date: new Date(y, m, d), current: true });
              }
              const rem = (7 - (list.length % 7)) % 7;
              for (let d = 1; d <= rem; d++) {
                list.push({ day: d, date: new Date(y, m + 1, d), current: false });
              }

              return list.map((item, idx) => {
                const iso = formatISODate(item.date);
                const dayEvts = events.filter((e) => e.date === iso);
                const today = isToday(item.date);
                return (
                  <div
                    key={idx}
                    className={`cal-month-cell${item.current ? "" : " muted"}${today ? " today" : ""}`}
                    onClick={() => {
                      onSelectDate(item.date);
                      setViewMode("day");
                    }}
                  >
                    <div className="cal-month-day-num">{item.day}</div>
                    <div className="cal-month-chips">
                      {dayEvts.slice(0, 3).map((evt) => {
                        const cat = CATEGORY_STYLES[evt.category] || CATEGORY_STYLES.work;
                        return (
                          <div
                            key={evt.id}
                            className="cal-month-chip"
                            style={{
                              background: cat.bg,
                              borderLeft: `2px solid ${cat.border}`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveEvent(evt);
                            }}
                          >
                            <span className="cm-time">{evt.startTime}</span>
                            <span className="cm-title">{evt.title}</span>
                            <button
                              type="button"
                              className="cal-chip-del-btn"
                              title="Etkinliği Sil"
                              aria-label="Etkinliği Sil"
                              onClick={(e) => handleDeleteEvent(evt.id, e)}
                            >
                              <Ic.Trash size={11} />
                            </button>
                          </div>
                        );
                      })}
                      {dayEvts.length > 3 ? (
                        <div className="cal-month-more">+{dayEvts.length - 3} etkinlik daha</div>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {activeEvent ? (
        <div className="modal-back" onClick={() => setActiveEvent(null)}>
          <div className="modal cal-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal-h">
              <div className="cal-modal-badge" style={{ background: CATEGORY_STYLES[activeEvent.category].bg, color: CATEGORY_STYLES[activeEvent.category].border }}>
                <Ic.Calendar size={15} />
                <span>{CATEGORY_STYLES[activeEvent.category].label}</span>
              </div>
              <button
                type="button"
                className="icon-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setActiveEvent(null)}
              >
                <Ic.X size={16} />
              </button>
            </div>

            <h3 className="cal-detail-title">{activeEvent.title}</h3>

            <div className="cal-detail-meta">
              <div className="cal-meta-row">
                <Ic.Clock size={16} className="cm-ic" />
                <span>
                  {activeEvent.date} · {activeEvent.startTime} – {activeEvent.endTime}
                </span>
              </div>
              {activeEvent.location ? (
                <div className="cal-meta-row">
                  <Ic.MapPin size={16} className="cm-ic" />
                  <span>{activeEvent.location}</span>
                </div>
              ) : null}
              {activeEvent.customer ? (
                <div className="cal-meta-row">
                  <Ic.Users size={16} className="cm-ic" />
                  <span>Müşteri: <b>{activeEvent.customer}</b></span>
                </div>
              ) : null}
            </div>

            {activeEvent.description ? (
              <div className="cal-detail-desc">{activeEvent.description}</div>
            ) : null}

            <div className="cal-modal-actions">
              <button
                type="button"
                className="btn danger"
                onClick={(e) => handleDeleteEvent(activeEvent.id, e)}
              >
                <Ic.Trash size={14} /> Sil
              </button>
              {onComposeMail ? (
                <button
                  type="button"
                  className="btn secondary"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    const subj = `Toplantı Hk: ${activeEvent.title}`;
                    setActiveEvent(null);
                    onComposeMail(undefined, subj);
                  }}
                >
                  <Ic.Mail size={14} /> E-posta Gönder
                </button>
              ) : null}
              <button
                type="button"
                className="btn primary"
                onClick={() => setActiveEvent(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* New Event Modal */}
      {isNewEventOpen ? (
        <div className="modal-back" onClick={closeNewEventModal}>
          <form className="modal cal-new-modal" onSubmit={handleCreateEvent} onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal-h">
              <h3>Yeni Takvim Etkinliği</h3>
              <button
                type="button"
                className="icon-btn"
                style={{ marginLeft: "auto" }}
                onClick={closeNewEventModal}
              >
                <Ic.X size={16} />
              </button>
            </div>

            <div className="cal-form-body">
              <label className="cal-field">
                <span>Başlık *</span>
                <input
                  type="text"
                  required
                  placeholder="Etkinlik veya görüşme başlığı"
                  value={newDraft.title}
                  onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
                  autoFocus
                />
              </label>

              <div className="cal-field-row">
                <label className="cal-field">
                  <span>Tarih</span>
                  <input
                    type="date"
                    value={newDraft.date}
                    onChange={(e) => setNewDraft({ ...newDraft, date: e.target.value })}
                  />
                </label>
                <label className="cal-field">
                  <span>Kategori</span>
                  <select
                    value={newDraft.category}
                    onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value as CalendarEvent["category"] })}
                  >
                    <option value="work">İş &amp; Sipariş</option>
                    <option value="visit">Saha Ziyareti</option>
                    <option value="meeting">Toplantı</option>
                    <option value="reminder">Hatırlatıcı</option>
                  </select>
                </label>
              </div>

              <div className="cal-field-row">
                <label className="cal-field">
                  <span>Başlangıç Saati</span>
                  <input
                    type="time"
                    value={newDraft.startTime}
                    onChange={(e) => setNewDraft({ ...newDraft, startTime: e.target.value })}
                  />
                </label>
                <label className="cal-field">
                  <span>Bitiş Saati</span>
                  <input
                    type="time"
                    value={newDraft.endTime}
                    onChange={(e) => setNewDraft({ ...newDraft, endTime: e.target.value })}
                  />
                </label>
              </div>

              <label className="cal-field">
                <span>Konum / Bağlantı</span>
                <input
                  type="text"
                  placeholder="Örn: Tuzla Şantiye, Toplantı Odası 2 veya Teams linki"
                  value={newDraft.location}
                  onChange={(e) => setNewDraft({ ...newDraft, location: e.target.value })}
                />
              </label>

              <label className="cal-field">
                <span>Açıklama / Notlar</span>
                <textarea
                  rows={3}
                  placeholder="Etkinlik detayları veya görüşme gündemi..."
                  value={newDraft.description}
                  onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                />
              </label>
            </div>

            <div className="cal-modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={closeNewEventModal}
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn primary"
                style={{ marginLeft: "auto" }}
              >
                <Ic.Check size={14} /> Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Toast Notification */}
      {toastMsg ? (
        <div className="toast-wrap">
          <div className="toast" role="status" aria-live="polite">
            <span className="ti">
              <Ic.Check size={14} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{toastMsg}</span>
            {undoEvent ? (
              <button
                type="button"
                className="cal-toast-undo"
                onClick={handleUndoDelete}
              >
                Geri Al
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
