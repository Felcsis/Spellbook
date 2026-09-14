"use client";

/**
 * Óra szerinti rács a napi / 3 napos / heti nézethez — a Google Naptárból
 * megszokott elrendezés, csillagtérkép-bőrben.
 *
 * Miért kell: a Google-ből behozott időpontoknak valódi kezdetük és végük van,
 * és egymás alatti chipekként nem látszik, hogy 9-kor vagy 17-kor vannak, sem az,
 * hogy ütköznek-e. A rács ezt mutatja meg.
 *
 * Ami nem fér a rácsba (vendégkártya, költség — ezeknek nincs órájuk), az a rács
 * fölötti "egész nap" sávba kerül, ugyanúgy, ahogy a Google Naptár csinálja.
 */

import { useRef, useState, type CSSProperties } from "react";

export type GridEvent = {
  id:     string;
  title:  string;
  start:  string;
  end:    string;
  allDay: boolean;
  cardId: string | null;
  // Kié a naptár, ahonnan az időpont jött. A vendégkártya erre a dolgozóra
  // készül, ezért az eseménnyel együtt kell utaznia.
  userId:   string;
  userName: string;
};

/**
 * A Spellbookban rögzített előjegyzés. A Google-eseménnyel egy rácson ül, de
 * többet tudunk róla (vendég, telefon, dolgozó), és műveletei is vannak.
 */
export type GridBooking = {
  id:        string;
  guestName: string;
  services:  string | null;
  phone:     string | null;
  start:     string;
  end:       string;
  workerName: string;
  color:     string;
};

/** Egy munkaidő-sáv: érkezés–távozás, a dolgozó színével. */
export type GridBand = {
  id:    string;
  label: string;
  start: string | null;   // "HH:MM"
  end:   string | null;
  color: string;
};

const PX_PER_HOUR = 44;

function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function minutesOfIso(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * A megjelenített órasáv. Nem fix 0–24, mert az a nap nagy részében üres helyet
 * mutatna — a tényleges adatokból számoljuk, egy óra ráhagyással.
 */
export function hourRange(
  events: GridEvent[],
  bands: GridBand[],
  bookings: { start: string; end: string }[] = [],
): [number, number] {
  let min = 9 * 60, max = 18 * 60;
  for (const e of events) {
    if (e.allDay) continue;
    min = Math.min(min, minutesOfIso(e.start));
    max = Math.max(max, minutesOfIso(e.end));
  }
  for (const b of bookings) {
    min = Math.min(min, minutesOfIso(b.start));
    max = Math.max(max, minutesOfIso(b.end));
  }
  for (const b of bands) {
    if (b.start) { const m = minutesOf(b.start); if (!isNaN(m)) min = Math.min(min, m); }
    if (b.end)   { const m = minutesOf(b.end);   if (!isNaN(m)) max = Math.max(max, m); }
  }
  return [Math.max(0, Math.floor(min / 60) - 1), Math.min(24, Math.ceil(max / 60) + 1)];
}

type Placed<T> = { ev: T; col: number; cols: number };

/** Az egymást átfedő időpontok egymás mellé kerülnek, ne takarják ki egymást. */
function layout<T extends { start: string; end: string }>(events: T[]): Placed<T>[] {
  const timed = [...events].sort((a, b) => minutesOfIso(a.start) - minutesOfIso(b.start));

  const out: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = cluster.reduce((n, c) => Math.max(n, c.col + 1), 0);
    cluster.forEach(c => { c.cols = cols; });
    out.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of timed) {
    const s = minutesOfIso(ev.start);
    const e = Math.max(minutesOfIso(ev.end), s + 15);
    if (s >= clusterEnd && cluster.length) flush();

    // Az első szabad oszlop ebben a csoportban
    const taken = new Set(cluster.filter(c => minutesOfIso(c.ev.end) > s).map(c => c.col));
    let col = 0;
    while (taken.has(col)) col++;

    cluster.push({ ev, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return out;
}

export function TimeGrid({ days, fromHour, toHour, onOpenCard, onOpenDay, onNewBooking, onSelectRange, onMove, onCancel }: {
  days: {
    date:     Date;
    label:    string;
    sub:      string;
    isToday:  boolean;
    events:   GridEvent[];
    bookings: GridBooking[];
    bands:    GridBand[];
    allDay:   { id: string; text: string; color: string }[];
  }[];
  fromHour: number;
  toHour:   number;
  onOpenCard: (ev: GridEvent, date: Date) => void;
  onOpenDay:  (ds: string) => void;
  onNewBooking?: (date: Date) => void;
  /** Húzással kijelölt idősáv — ebből lesz időpont. */
  onSelectRange?: (date: Date, startMinutes: number, endMinutes: number) => void;
  onMove?:       (b: GridBooking) => void;
  onCancel?:     (b: GridBooking) => void;
}) {
  // Húzásos idősáv-kijelölés. A kezdést és a véget 15 percre igazítjuk, mert a
  // szalonban úgyis negyedórákban gondolkodunk.
  const SNAP = 15;
  const [drag, setDrag] = useState<{ dayKey: string; from: number; to: number } | null>(null);
  const dragging = useRef(false);

  /** Az oszlopon belüli függőleges pozícióból perc. */
  function minutesAt(e: React.MouseEvent<HTMLDivElement>, el: HTMLDivElement): number {
    const rect = el.getBoundingClientRect();
    const y    = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const mins = fromHour * 60 + (y / PX_PER_HOUR) * 60;
    return Math.round(mins / SNAP) * SNAP;
  }

  function endDrag() {
    if (drag && onSelectRange) {
      const day = days.find(d => keyOf(d) === drag.dayKey);
      const from = Math.min(drag.from, drag.to);
      const to   = Math.max(drag.from, drag.to);
      // A puszta kattintást (nulla hosszú húzás) nem tekintjük kijelölésnek.
      if (day && to - from >= SNAP) onSelectRange(day.date, from, to);
    }
    dragging.current = false;
    setDrag(null);
  }

  const hours  = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const height = hours.length * PX_PER_HOUR;
  const top    = (mins: number) => ((mins - fromHour * 60) / 60) * PX_PER_HOUR;

  const cell: CSSProperties = {
    flex: 1, minWidth: 0, position: "relative",
    borderLeft: "1px solid var(--border)",
  };

  return (
    <div style={{
      background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 18,
      overflow: "hidden", boxShadow: "var(--shadow-card)",
    }}>
      {/* Fejléc: napok */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 48, flexShrink: 0 }} />
        {days.map(d => (
          <div key={keyOf(d)} onClick={() => onOpenDay(toDateStr(d.date))}
            style={{
              ...cell, padding: "0.6rem 0.5rem", cursor: "pointer", textAlign: "center",
              background: d.isToday ? "var(--bg-today)" : "transparent",
            }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {d.label}
            </div>
            {onNewBooking && (
              <button onClick={ev => { ev.stopPropagation(); onNewBooking(d.date); }}
                title="Új időpont erre a napra"
                style={{
                  position: "absolute", top: 4, right: 5, background: "none", border: "none",
                  cursor: "pointer", color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1, padding: 0,
                }}>＋</button>
            )}
            <div style={{
              fontFamily: "var(--font-playfair)", fontSize: "1.25rem", lineHeight: 1.3,
              color: d.isToday ? "var(--color-teal)" : "var(--text-primary)",
              textShadow: d.isToday ? "0 0 12px var(--color-teal-dim)" : "none",
              animation: d.isToday ? "goldPulse 3.2s ease-in-out infinite" : "none",
            }}>
              {d.isToday && <span style={{ fontSize: "0.7rem", marginRight: "0.25rem" }}>✦</span>}
              {d.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Egész napos sáv: aminek nincs órája */}
      {days.some(d => d.allDay.length > 0) && (
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-row)" }}>
          <div style={{ width: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "0.4rem" }}>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.42rem", letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase" }}>egész nap</span>
          </div>
          {days.map(d => (
            <div key={`ad-${keyOf(d)}`} style={{ ...cell, padding: "0.3rem 0.25rem", minHeight: 26 }}>
              {d.allDay.map(a => (
                <div key={a.id} title={a.text} style={{
                  padding: "0.1rem 0.4rem", marginBottom: "0.15rem", borderRadius: 5,
                  background: `${a.color}14`, border: `1px solid ${a.color}30`,
                  fontFamily: "var(--font-cormorant)", fontSize: "0.74rem", color: a.color,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {a.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Órarács */}
      <div style={{ display: "flex", position: "relative", height, overflow: "hidden" }}>
        {/* Óra-skála */}
        <div style={{ width: 48, flexShrink: 0, position: "relative" }}>
          {hours.map((h, i) => (
            <div key={h} style={{
              position: "absolute", top: i * PX_PER_HOUR - 6, right: "0.45rem",
              fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.06em",
              color: "var(--text-dim)",
            }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map(d => {
          const placed = layout(d.events.filter(e => !e.allDay));
          const dayKey = keyOf(d);
          return (
            <div key={`col-${dayKey}`}
              style={{ ...cell, background: d.isToday ? "var(--bg-today)" : "transparent", cursor: onSelectRange ? "crosshair" : "default" }}
              onMouseDown={e => {
                if (!onSelectRange || e.button !== 0) return;
                // Csak az üres háttéren induljon kijelölés, ne egy kártyán.
                if (e.target !== e.currentTarget) return;
                const m = minutesAt(e, e.currentTarget);
                dragging.current = true;
                setDrag({ dayKey, from: m, to: m + SNAP });
              }}
              onMouseMove={e => {
                if (!dragging.current || !drag || drag.dayKey !== dayKey) return;
                setDrag({ ...drag, to: minutesAt(e, e.currentTarget) });
              }}
              onMouseUp={endDrag}
              onMouseLeave={() => { if (dragging.current) endDrag(); }}>

              {/* A húzás közbeni kijelölés */}
              {drag?.dayKey === dayKey && (() => {
                const a = Math.min(drag.from, drag.to);
                const b = Math.max(drag.from, drag.to);
                return (
                  <div style={{
                    position: "absolute", left: 2, right: 2, zIndex: 5,
                    top: top(a), height: Math.max(2, ((b - a) / 60) * PX_PER_HOUR),
                    background: "var(--bg-active)", border: "1px dashed var(--border-strong)",
                    borderRadius: 6, pointerEvents: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.08em", color: "var(--color-teal)" }}>
                      {fmtMinutes(a)}–{fmtMinutes(b)}
                    </span>
                  </div>
                );
              })()}
              {/* Óravonalak */}
              {hours.map((h, i) => (
                <div key={h} style={{
                  position: "absolute", left: 0, right: 0, top: i * PX_PER_HOUR, height: 1,
                  background: "var(--border)", opacity: 0.5,
                }} />
              ))}

              {/* Munkaidő-sávok — halvány fénycsík a háttérben */}
              {d.bands.map(b => {
                const s = b.start ? minutesOf(b.start) : NaN;
                const e = b.end   ? minutesOf(b.end)   : NaN;
                if (isNaN(s) || isNaN(e) || e <= s) return null;
                return (
                  <div key={b.id} title={`${b.label} · ${b.start}–${b.end}`} style={{
                    position: "absolute", left: 2, right: 2,
                    top: top(s), height: ((e - s) / 60) * PX_PER_HOUR,
                    background: `linear-gradient(180deg, ${b.color}22, ${b.color}0c)`,
                    borderLeft: `2px solid ${b.color}80`, borderRadius: 4,
                  }} />
                );
              })}

              {/* Előjegyzések — a saját foglalásaink */}
              {layout(d.bookings).map(({ ev: b, col, cols }) => {
                const s = minutesOfIso(b.start);
                const e = Math.max(minutesOfIso(b.end), s + 30);
                const w = 100 / cols;
                return (
                  <div key={b.id} title={`${b.guestName}${b.phone ? ` · ${b.phone}` : ""} — ${b.workerName}`}
                    style={{
                      position: "absolute", top: top(s), height: ((e - s) / 60) * PX_PER_HOUR - 2,
                      left: `calc(${col * w}% + 3px)`, width: `calc(${w}% - 6px)`,
                      background: `linear-gradient(150deg, ${b.color}45, ${b.color}20)`,
                      border: `1px solid ${b.color}`,
                      borderRadius: 7, padding: "0.15rem 0.35rem", overflow: "hidden",
                      boxShadow: `0 0 10px ${b.color}30`,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.58rem", color: b.color }}>
                        {fmtTime(b.start)}
                      </span>
                      {onMove && (
                        <button onClick={() => onMove(b)} title="Áthelyezés"
                          style={miniAction(b.color)}>⇄</button>
                      )}
                      {onCancel && (
                        <button onClick={() => onCancel(b)} title="Lemondás"
                          style={miniAction("#c47878")}>✕</button>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.86rem", color: "var(--text-primary)", lineHeight: 1.15 }}>
                      {b.guestName}
                    </div>
                    {b.services && (
                      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.74rem", color: "var(--text-soft)", lineHeight: 1.1 }}>
                        {b.services}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Időpontok */}
              {placed.map(({ ev, col, cols }) => {
                const s = minutesOfIso(ev.start);
                const e = Math.max(minutesOfIso(ev.end), s + 30);
                const w = 100 / cols;
                return (
                  <div key={ev.id} onClick={() => !ev.cardId && onOpenCard(ev, d.date)}
                    title={`${ev.title} — ${fmtTime(ev.start)}`}
                    style={{
                      position: "absolute", top: top(s), height: ((e - s) / 60) * PX_PER_HOUR - 2,
                      left: `calc(${col * w}% + 3px)`, width: `calc(${w}% - 6px)`,
                      background: "linear-gradient(150deg, rgba(106,143,176,0.30), rgba(106,143,176,0.14))",
                      border: "1px solid rgba(106,143,176,0.55)",
                      borderRadius: 7, padding: "0.15rem 0.35rem", overflow: "hidden",
                      cursor: ev.cardId ? "default" : "pointer",
                      boxShadow: "0 0 10px rgba(106,143,176,0.18)",
                    }}>
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.58rem", color: "#6a8fb0", opacity: 0.9 }}>
                      {fmtTime(ev.start)}
                    </div>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.15 }}>
                      {ev.cardId ? "♦ " : ""}{ev.title}
                    </div>
                    {!ev.cardId && (
                      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.08em", color: "#6a8fb0", marginTop: "0.1rem" }}>
                        + KÁRTYA
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Apró művelet-gomb egy előjegyzés-kártyán. */
function miniAction(color: string): React.CSSProperties {
  return {
    background: "none", border: "none", cursor: "pointer", color,
    fontSize: "0.62rem", lineHeight: 1, padding: 0, marginLeft: "auto",
  };
}

/** Stabil kulcs egy naphoz — a dátum, nem a felirat. */
function keyOf(d: { date: Date }): string {
  return toDateStr(d.date);
}

function fmtMinutes(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
