"use client";

/**
 * A kijelölt napok műveletsávja.
 *
 * Három dolgot lehet a kijelöléssel kezdeni, és mind a három olyan, amit eddig
 * naponta, egyesével kellett: munkaidő megadása, szabadságra jelölés, és a
 * kijelölt időszak összesítője.
 */

import { useState } from "react";
import { api } from "~/trpc/react";

const fmtFt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

type Mode = null | "hours" | "off" | "sum" | "bookable";

export function SelectionBar({ dates, workers, defaultWorkerId, summary, onClear }: {
  dates:  string[];                       // "YYYY-MM-DD", rendezve
  workers: { id: string; name: string | null }[];
  defaultWorkerId: string;
  /** A kijelölt napok összesítője — a naptár már úgyis kiszámolta. */
  summary: { revenue: number; costs: number; hours: number; guests: number; bookings: number };
  onClear: () => void;
}) {
  const utils = api.useUtils();
  const [mode,   setMode]   = useState<Mode>(null);
  const [worker, setWorker] = useState(defaultWorkerId);
  const [start,  setStart]  = useState("09:00");
  const [end,    setEnd]    = useState("17:00");
  const [reason, setReason] = useState("");
  const [msg,    setMsg]    = useState("");

  const refresh = () => {
    void utils.calendar.month.invalidate();
    void utils.timeOff.list.invalidate();
    void utils.appointments.freeSlots.invalidate();
    void utils.bookable.list.invalidate();
  };

  const setHours = api.calendar.setHoursBulk.useMutation({
    onSuccess: r => { setMsg(`${r.count} napra beállítva: ${start}–${end}`); setMode(null); refresh(); },
    onError:   e => setMsg(e.message),
  });

  const setBookable = api.bookable.addBulk.useMutation({
    onSuccess: r => { setMsg(`${r.count} napra kiadva online: ${start}–${end}`); setMode(null); refresh(); },
    onError:   e => setMsg(e.message),
  });
  const clearBookable = api.bookable.clearDays.useMutation({
    onSuccess: r => { setMsg(r.count > 0 ? `${r.count} sáv levéve` : "Nem volt kiadott sáv"); setMode(null); refresh(); },
    onError:   e => setMsg(e.message),
  });

  const setOff = api.timeOff.set.useMutation({
    onSuccess: r => { setMsg(`${r.count} nap nem foglalható`); setMode(null); refresh(); },
    onError:   e => setMsg(e.message),
  });

  const clearOff = api.timeOff.remove.useMutation({
    onSuccess: r => { setMsg(r.count > 0 ? `${r.count} napról levéve` : "Nem volt megjelölt nap"); setMode(null); refresh(); },
    onError:   e => setMsg(e.message),
  });

  const busy = setHours.isPending || setOff.isPending || clearOff.isPending
    || setBookable.isPending || clearBookable.isPending;
  const label = dates.length === 1
    ? new Date(`${dates[0]}T12:00:00`).toLocaleDateString("hu-HU", { month: "long", day: "numeric" })
    : `${dates.length} nap`;

  return (
    <div style={{
      position: "sticky", bottom: "1rem", zIndex: 40, marginTop: "1rem",
      background: "var(--bg-modal)", border: "1px solid var(--border-strong)",
      borderRadius: 16, padding: "0.85rem 1rem",
      boxShadow: "var(--shadow-modal)",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
        <span style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--color-teal)",
        }}>
          ✦ {label} kijelölve
        </span>

        <div style={{ flex: 1 }} />

        <button onClick={() => { setMode(mode === "hours" ? null : "hours"); setMsg(""); }} style={btn(mode === "hours")}>
          Munkaidő
        </button>
        <button onClick={() => { setMode(mode === "bookable" ? null : "bookable"); setMsg(""); }} style={btn(mode === "bookable")}>
          Foglalható
        </button>
        <button onClick={() => { setMode(mode === "off" ? null : "off"); setMsg(""); }} style={btn(mode === "off")}>
          Szabadság
        </button>
        <button onClick={() => { setMode(mode === "sum" ? null : "sum"); setMsg(""); }} style={btn(mode === "sum")}>
          Összesítő
        </button>
        <button onClick={onClear} style={{ ...btn(false), color: "var(--text-dim)", borderColor: "transparent" }}>
          Mégsem
        </button>
      </div>

      {mode === "hours" && (
        <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          {workers.length > 1 && (
            <select value={worker} onChange={e => setWorker(e.target.value)} style={field}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} aria-label="Érkezés" />
          <span style={{ color: "var(--text-soft)" }}>–</span>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={field} aria-label="Távozás" />
          <button disabled={busy}
            onClick={() => setHours.mutate({ dates, userId: worker, startTime: start || null, endTime: end || null })}
            style={primary}>
            {busy ? "Mentés…" : `Beállítás ${dates.length} napra`}
          </button>
          <button disabled={busy}
            onClick={() => setHours.mutate({ dates, userId: worker, startTime: null, endTime: null })}
            style={{ ...btn(false), color: "var(--text-dim)" }}>
            Munkaidő törlése
          </button>
        </div>
      )}

      {mode === "bookable" && (
        <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          {workers.length > 1 && (
            <select value={worker} onChange={e => setWorker(e.target.value)} style={field}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} aria-label="Sáv kezdete" />
          <span style={{ color: "var(--text-soft)" }}>–</span>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={field} aria-label="Sáv vége" />
          <button disabled={busy}
            onClick={() => setBookable.mutate({ dates, workerId: worker, startTime: start, endTime: end })}
            style={primary}>
            {busy ? "Mentés…" : `Kiadás ${dates.length} napra`}
          </button>
          <button disabled={busy}
            onClick={() => clearBookable.mutate({ dates, workerId: worker })}
            style={{ ...btn(false), color: "var(--text-dim)" }}>
            Kiadás visszavonása
          </button>
          <span style={{
            flexBasis: "100%", fontFamily: "var(--font-cormorant)", fontSize: "0.82rem",
            color: "var(--text-dim)", fontStyle: "italic",
          }}>
            Ennyit adunk ki online foglalásra ezekre a napokra — a munkaidő többi része marad beugró vendégnek.
          </span>
        </div>
      )}

      {mode === "off" && (
        <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          <select value={worker} onChange={e => setWorker(e.target.value)} style={field}>
            <option value="">Egész szalon</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Ok (nem kötelező) — pl. szabadság" style={{ ...field, minWidth: 200, flex: 1 }} />
          <button disabled={busy}
            onClick={() => setOff.mutate({ dates, workerId: worker || null, reason: reason || undefined })}
            style={primary}>
            {busy ? "Mentés…" : "Nem foglalható"}
          </button>
          <button disabled={busy}
            onClick={() => clearOff.mutate({ dates, workerId: worker || null })}
            style={{ ...btn(false), color: "var(--text-dim)" }}>
            Megjelölés levétele
          </button>
        </div>
      )}

      {mode === "sum" && (
        <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
          <Stat label="Bevétel"  value={fmtFt(summary.revenue)} color="#7a9e8c" />
          {summary.costs > 0 && <Stat label="Költség" value={`−${fmtFt(summary.costs)}`} color="#c49060" />}
          <Stat label="Ledolgozott óra" value={summary.hours > 0 ? `${summary.hours.toFixed(1)} ó` : "—"} color="var(--color-teal)" />
          <Stat label="Vendégkártya"    value={String(summary.guests)}   color="#c09898" />
          <Stat label="Előjegyzés"      value={String(summary.bookings)} color="#6a8fb0" />
        </div>
      )}

      {msg && (
        <div style={{ marginTop: "0.6rem", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--color-teal)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: "0.38rem 0.8rem", borderRadius: 8, cursor: "pointer",
    border: active ? "1px solid var(--border-strong)" : "1px solid var(--border)",
    background: active ? "var(--bg-active)" : "transparent",
    color: active ? "var(--color-teal)" : "var(--text-soft)",
    fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em",
    textTransform: "uppercase", whiteSpace: "nowrap",
  };
}

const primary: React.CSSProperties = {
  padding: "0.42rem 1rem", borderRadius: 8, border: "none", cursor: "pointer",
  background: "linear-gradient(120deg,#4a7a6a,#527666,#4a7a6a)", color: "#fff",
  fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em",
  textTransform: "uppercase", whiteSpace: "nowrap",
};

const field: React.CSSProperties = {
  padding: "0.35rem 0.6rem", borderRadius: 8,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem",
  outline: "none",
};
