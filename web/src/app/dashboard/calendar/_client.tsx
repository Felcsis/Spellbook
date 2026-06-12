"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS   = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const DAYS_S   = ["H","K","Sz","Cs","P","Szo","V"];
const DAYS_L   = ["Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat","Vasárnap"];
const USER_COLORS = ["#c9a84c","#a78bfa","#e8b4c8","#6ee7b7","#fb923c"];

type View = "month" | "week" | "3day" | "day";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkDay = {
  id: string; date: Date | string;
  userId: string; earnings: number; notes: string | null;
  user: { id: string; name: string | null };
};
type User = { id: string; name: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// Monday-based week start
function weekStart(d: Date) {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dow);
  return r;
}

function formatDayHeader(d: Date, short = false) {
  return d.toLocaleDateString("hu-HU", short
    ? { month: "short", day: "numeric" }
    : { month: "long", day: "numeric", weekday: "long" });
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
  padding: "0.7rem 0.9rem", color: "var(--color-cream)",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", transition: "border-color 0.3s, box-shadow 0.3s",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem",
  letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold-dim)", marginBottom: "0.4rem",
};
const navBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: "8px", color: "var(--color-gold)", fontSize: "1.2rem",
  width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.2s, border-color 0.2s",
};

// ── Worker card (inside a day column/cell) ────────────────────────────────────
function WorkerChip({ entry, color, expanded, onClick }: {
  entry: WorkDay; color: string; expanded: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: expanded ? "0.85rem 1rem" : "0.3rem 0.6rem",
        borderRadius: "10px",
        background: expanded ? `${color}20` : `${color}14`,
        border: `1px solid ${expanded ? color + "66" : color + "30"}`,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        marginBottom: "0.3rem",
        boxShadow: expanded ? `0 4px 20px ${color}22` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}99` }} />
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color, fontWeight: expanded ? 600 : 400, flex: 1 }}>
          {entry.user.name}
        </span>
        <span style={{ fontFamily: "var(--font-playfair)", fontSize: expanded ? "1rem" : "0.78rem", color, fontWeight: 700, flexShrink: 0 }}>
          {expanded ? fmt(entry.earnings) : `${Math.round(entry.earnings / 1000)}k`}
        </span>
      </div>
      {expanded && entry.notes && (
        <div style={{ marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: `1px solid ${color}22`, fontStyle: "italic", fontSize: "0.85rem", color: `${color}bb`, fontFamily: "var(--font-cormorant)" }}>
          {entry.notes}
        </div>
      )}
    </div>
  );
}

// ── Add entry modal ───────────────────────────────────────────────────────────
function AddModal({ dateStr, users, userColors, onClose }: {
  dateStr: string; users: User[]; userColors: Record<string, string>; onClose: () => void;
}) {
  const utils   = api.useUtils();
  const upsert  = api.calendar.upsert.useMutation({ onSuccess: () => { void utils.calendar.month.invalidate(); onClose(); } });
  const [userId,   setUserId]   = useState(users[0]?.id ?? "");
  const [earnings, setEarnings] = useState("");
  const [notes,    setNotes]    = useState("");

  const accentColor = userColors[userId] ?? "var(--color-gold)";
  const displayDate = new Date(dateStr + "T12:00:00").toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0d0a1a", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "20px", padding: "2rem 2.25rem", width: "100%", maxWidth: 460, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--color-gold-dim)", marginBottom: "0.3rem" }}>ÚJ BEJEGYZÉS</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: "var(--color-gold-light)", textTransform: "capitalize" }}>{displayDate}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(245,230,211,0.3)", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); upsert.mutate({ date: dateStr, userId, earnings: parseFloat(earnings), notes: notes || undefined }); }} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* User pills */}
          <div>
            <label style={labelStyle}>Ki dolgozott?</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {users.map(u => {
                const col = userColors[u.id] ?? "#c9a84c";
                const sel = userId === u.id;
                return (
                  <button key={u.id} type="button" onClick={() => setUserId(u.id)}
                    style={{ padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", border: sel ? `1px solid ${col}88` : "1px solid rgba(255,255,255,0.08)", background: sel ? `${col}18` : "transparent", color: sel ? col : "rgba(245,230,211,0.45)", fontFamily: "var(--font-cormorant)", fontSize: "1rem", transition: "all 0.2s" }}>
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Kereset (Ft)</label>
              <input type="number" value={earnings} onChange={e => setEarnings(e.target.value)} placeholder="0" min="0" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}18`; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. Festés, vágás..." style={inputStyle}
                onFocus={e => { e.target.style.borderColor = accentColor; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.8rem", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(245,230,211,0.5)", fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", letterSpacing: "0.15em", cursor: "pointer" }}>Mégse</button>
            <button type="submit" disabled={upsert.isPending}
              style={{ flex: 2, padding: "0.8rem", border: "none", borderRadius: "10px", cursor: upsert.isPending ? "not-allowed" : "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.18em", color: "#07040f", background: "linear-gradient(120deg, #7a6229 0%, #c9a84c 50%, #7a6229 100%)", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite", boxShadow: "0 4px 16px rgba(201,168,76,0.25)", opacity: upsert.isPending ? 0.7 : 1 }}>
              {upsert.isPending ? "Mentés..." : "Mentés ✦"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Day column (used in week / 3day / day views) ──────────────────────────────
function DayColumn({ date, entries, userColors, isToday, onAdd, compact = false }: {
  date: Date; entries: WorkDay[]; userColors: Record<string, string>;
  isToday: boolean; onAdd: (dateStr: string) => void; compact?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dateStr  = toDateStr(date);
  const dayTotal = entries.reduce((s, e) => s + e.earnings, 0);
  const dow = (date.getDay() + 6) % 7;

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: isToday ? "rgba(201,168,76,0.04)" : "transparent",
      border: isToday ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(201,168,76,0.08)",
      borderRadius: "14px",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Day header */}
      <div
        onClick={() => onAdd(dateStr)}
        style={{
          padding: compact ? "0.6rem 0.75rem" : "0.9rem 1rem",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
          cursor: "pointer",
          background: isToday ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.02)",
          transition: "background 0.2s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.02)"; }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: compact ? "0.58rem" : "0.62rem", letterSpacing: "0.12em", color: isToday ? "var(--color-gold)" : "var(--color-gold-dim)", textTransform: "uppercase" }}>
            {DAYS_L[dow]}
          </div>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: compact ? "1.1rem" : "1.4rem", color: isToday ? "var(--color-gold)" : "var(--color-cream)", lineHeight: 1.1 }}>
            {date.getDate()}
            {!compact && <span style={{ fontSize: "0.8rem", color: "rgba(245,230,211,0.4)", marginLeft: "0.4rem" }}>{MONTHS[date.getMonth()]}</span>}
          </div>
        </div>
        {dayTotal > 0 && (
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: "var(--color-gold)", fontWeight: 700, textAlign: "right" }}>
            {fmt(dayTotal)}
          </div>
        )}
      </div>

      {/* Entries */}
      <div style={{ padding: "0.6rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {entries.length === 0 ? (
          <div
            onClick={() => onAdd(dateStr)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(245,230,211,0.15)", fontSize: "1.5rem", minHeight: 60 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.35)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(245,230,211,0.15)"; }}
          >+</div>
        ) : (
          entries.map(e => (
            <WorkerChip
              key={e.id}
              entry={e}
              color={userColors[e.userId] ?? "#c9a84c"}
              expanded={expandedId === e.id}
              onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
            />
          ))
        )}
        {entries.length > 0 && (
          <div
            onClick={() => onAdd(dateStr)}
            style={{ marginTop: "0.25rem", padding: "0.25rem", borderRadius: "6px", border: "1px dashed rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.35)", fontSize: "0.75rem", textAlign: "center", cursor: "pointer", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em", transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.5)"; (e.currentTarget as HTMLElement).style.color = "var(--color-gold)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.2)"; (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.35)"; }}
          >+ hozzáad</div>
        )}
      </div>
    </div>
  );
}

// ── Month view ─────────────────────────────────────────────────────────────────
function MonthView({ year, month, byDate, userColors, today, onAdd }: {
  year: number; month: number; byDate: Record<string, WorkDay[]>;
  userColors: Record<string, string>; today: string; onAdd: (d: string) => void;
}) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const firstDay    = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startOffset   = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "20px", overflow: "hidden" }}>
      {/* Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
        {DAYS_S.map(d => (
          <div key={d} style={{ padding: "0.65rem 0", textAlign: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.16em", color: "var(--color-gold-dim)", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} style={{ minHeight: 90, borderRight: "1px solid rgba(201,168,76,0.06)", borderBottom: "1px solid rgba(201,168,76,0.06)", background: "rgba(0,0,0,0.12)" }} />;
          const ds      = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const entries = byDate[ds] ?? [];
          const isToday = ds === today;
          const dayTotal = entries.reduce((s, e) => s + e.earnings, 0);

          return (
            <div key={ds}
              style={{ minHeight: 90, padding: "0.4rem", borderRight: "1px solid rgba(201,168,76,0.06)", borderBottom: "1px solid rgba(201,168,76,0.06)", background: isToday ? "rgba(201,168,76,0.05)" : "transparent", cursor: "pointer", transition: "background 0.18s", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "rgba(201,168,76,0.05)" : "transparent"; }}
            >
              {/* Day number */}
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", color: isToday ? "#07040f" : "rgba(245,230,211,0.5)", background: isToday ? "var(--color-gold)" : "transparent", boxShadow: isToday ? "0 0 10px rgba(201,168,76,0.5)" : "none", marginBottom: "0.3rem" }}>{day}</div>

              {/* Worker chips */}
              {entries.map(e => {
                const col = userColors[e.userId] ?? "#c9a84c";
                const expanded = expandedEntry === e.id;
                return (
                  <div key={e.id}
                    onClick={ev => { ev.stopPropagation(); setExpandedEntry(expanded ? null : e.id); setExpandedCell(ds); }}
                    style={{ padding: expanded ? "0.35rem 0.5rem" : "0.18rem 0.4rem", borderRadius: "6px", background: `${col}${expanded ? "22" : "16"}`, border: `1px solid ${col}${expanded ? "55" : "28"}`, marginBottom: "0.2rem", transition: "all 0.22s", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.75rem", color: col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.user.name}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.68rem", color: col, fontWeight: 700, flexShrink: 0 }}>{Math.round(e.earnings / 1000)}k</span>
                    </div>
                    {expanded && (
                      <div style={{ marginTop: "0.25rem", paddingTop: "0.25rem", borderTop: `1px solid ${col}22` }}>
                        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: col, fontWeight: 700 }}>{fmt(e.earnings)}</div>
                        {e.notes && <div style={{ fontStyle: "italic", fontSize: "0.72rem", color: `${col}99` }}>{e.notes}</div>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add button */}
              <div onClick={() => onAdd(ds)} style={{ padding: "0.15rem 0.4rem", borderRadius: "5px", border: "1px dashed rgba(201,168,76,0.15)", color: "rgba(201,168,76,0.25)", fontSize: "0.65rem", textAlign: "center", fontFamily: "var(--font-cinzel)", cursor: "pointer", transition: "all 0.18s", marginTop: "0.15rem" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-gold)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.45)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.25)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.15)"; }}
              >+</div>

              {/* Day total */}
              {dayTotal > 0 && <div style={{ position: "absolute", bottom: 4, right: 5, fontFamily: "var(--font-playfair)", fontSize: "0.6rem", color: "rgba(201,168,76,0.45)", fontWeight: 700 }}>{fmt(dayTotal)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main client ────────────────────────────────────────────────────────────────
export default function CalendarClient() {
  const now = new Date();
  const [view, setView]             = useState<View>("month");
  const [anchor, setAnchor]         = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [addDateStr, setAddDateStr] = useState<string | null>(null);

  // Compute query range based on view
  const qYear  = anchor.getFullYear();
  const qMonth = anchor.getMonth() + 1;

  const { data: users    = [] } = api.calendar.users.useQuery();
  const { data: workDays = [] } = api.calendar.month.useQuery({ year: qYear, month: qMonth });

  const userColors: Record<string, string> = {};
  users.forEach((u, i) => { userColors[u.id] = USER_COLORS[i % USER_COLORS.length]!; });

  const byDate: Record<string, WorkDay[]> = {};
  workDays.forEach(w => {
    const key = new Date(w.date).toISOString().slice(0, 10);
    (byDate[key] ??= []).push(w as WorkDay);
  });

  const todayStr = toDateStr(now);

  // Monthly user totals
  const userTotals: Record<string, number> = {};
  workDays.forEach(w => { userTotals[w.userId] = (userTotals[w.userId] ?? 0) + w.earnings; });

  // Navigation
  function navigate(dir: -1 | 1) {
    setAnchor(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else if (view === "3day") d.setDate(d.getDate() + dir * 3);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }

  // Header label
  function navLabel() {
    if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const ws = weekStart(anchor); const we = addDays(ws, 6);
      return `${ws.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
    }
    if (view === "3day") {
      const end = addDays(anchor, 2);
      return `${anchor.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
    }
    return anchor.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  }

  // Days to show for column views
  function columnDays(): Date[] {
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i));
    if (view === "3day") return Array.from({ length: 3 }, (_, i) => addDays(anchor, i));
    return [anchor];
  }

  const VIEW_BTNS: { key: View; label: string }[] = [
    { key: "month", label: "Havi" },
    { key: "week",  label: "Heti" },
    { key: "3day",  label: "3 napos" },
    { key: "day",   label: "Napi" },
  ];

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", display: "flex", flexDirection: "column", height: "100%" }}>
      {addDateStr && (
        <AddModal dateStr={addDateStr} users={users} userColors={userColors} onClose={() => setAddDateStr(null)} />
      )}

      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-gold-light)", textShadow: "0 0 24px rgba(201,168,76,0.3)", animation: "float 4s ease-in-out infinite" }}>
          Munkanaptár ✦
        </h1>
        <p style={{ fontStyle: "italic", color: "var(--color-rose)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1rem" }}>
          Ki mikor dolgozott és mennyit keresett
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>

        {/* View switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "10px", padding: "3px", gap: "3px" }}>
          {VIEW_BTNS.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              style={{
                padding: "0.45rem 0.9rem", border: "none", borderRadius: "7px", cursor: "pointer",
                fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.12em",
                background: view === key ? "rgba(201,168,76,0.2)" : "transparent",
                color: view === key ? "var(--color-gold)" : "rgba(245,230,211,0.45)",
                boxShadow: view === key ? "0 0 12px rgba(201,168,76,0.15)" : "none",
                transition: "all 0.2s",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Nav + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
          <button onClick={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), now.getDate()))}
            style={{ ...navBtnStyle, width: "auto", padding: "0 0.75rem", fontSize: "0.62rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
            Ma
          </button>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.8rem", letterSpacing: "0.1em", color: "var(--color-gold)", minWidth: 200, textAlign: "center", textTransform: "capitalize" }}>
            {navLabel()}
          </span>
          <button onClick={() => navigate(1)} style={navBtnStyle}>›</button>
        </div>

        {/* User legend / totals */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {users.map((u, i) => {
            const col   = USER_COLORS[i % USER_COLORS.length]!;
            const total = userTotals[u.id] ?? 0;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", background: `${col}12`, border: `1px solid ${col}30`, borderRadius: "8px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}88` }} />
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: col }}>{u.name}</span>
                {view === "month" && total > 0 && (
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: col, fontWeight: 700 }}>{fmt(total)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar body */}
      {view === "month" && (
        <MonthView year={qYear} month={qMonth} byDate={byDate} userColors={userColors} today={todayStr} onAdd={setAddDateStr} />
      )}

      {(view === "week" || view === "3day" || view === "day") && (
        <div style={{ display: "flex", gap: "0.75rem", flex: 1, minHeight: 0 }}>
          {columnDays().map(date => (
            <DayColumn
              key={toDateStr(date)}
              date={date}
              entries={byDate[toDateStr(date)] ?? []}
              userColors={userColors}
              isToday={toDateStr(date) === todayStr}
              onAdd={setAddDateStr}
              compact={view === "week"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
