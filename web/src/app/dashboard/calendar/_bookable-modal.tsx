"use client";

/**
 * Foglalható idő megadása kézzel.
 *
 * A húzás gyors, de nem pontos, és szünetet sem lehet vele jelölni. Itt be lehet
 * írni a dátumot (egy napot vagy egy időszakot), a napi sávot, és a szüneteket —
 * amiket a mentés kivág a sávból, így a foglaló sosem ajánl fel ebédidőt.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";

const lbl: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem",
};

const field: React.CSSProperties = {
  padding: "0.5rem 0.7rem", borderRadius: 9,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box", width: "100%",
};

const DAYS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookableModal({ defaultDate, workers, defaultWorkerId, onClose }: {
  defaultDate: Date;
  workers: { id: string; name: string | null; priceListType?: string }[];
  defaultWorkerId: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [worker, setWorker] = useState(defaultWorkerId);
  const [from,   setFrom]   = useState(toDateStr(defaultDate));
  const [to,     setTo]     = useState(toDateStr(defaultDate));
  const [start,  setStart]  = useState("09:00");
  const [end,    setEnd]    = useState("17:00");
  // Napok, amikre vonatkozik. Alapból hétfő–péntek, mert a legtöbb nyitás ilyen.
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [msg,    setMsg]    = useState("");

  // Mire adjuk ki a sávot. Üresen: bármire — ez a leggyakoribb, ezért ez az alap.
  const [cats, setCats] = useState<string[]>([]);
  const [svcs, setSvcs] = useState<string[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);

  const { data: allCategories = [] } = api.calendar.services.useQuery();
  // Mindenki a saját árlistájáról dolgozik; a másik lista tételeit fel se kínáljuk.
  const listType   = workers.find(w => w.id === worker)?.priceListType;
  const categories = listType
    ? allCategories.filter(c => c.priceListType === listType)
    : allCategories;

  /** A kategória állapota: egészben kiadva, néhány tétele, vagy semmi. */
  function catState(c: { id: string; services: { id: string }[] }) {
    if (cats.includes(c.id)) return "mind" as const;
    return c.services.some(s => svcs.includes(s.id)) ? "reszben" as const : "nincs" as const;
  }

  function toggleCat(c: { id: string; services: { id: string }[] }) {
    const ids = c.services.map(s => s.id);
    if (cats.includes(c.id)) {
      setCats(x => x.filter(id => id !== c.id));
    } else {
      setCats(x => [...x, c.id]);
      // A kategória egészben tartalmazza a tételeit: a külön jelöltek feleslegessé válnak.
      setSvcs(x => x.filter(id => !ids.includes(id)));
    }
  }

  function toggleSvc(catId: string, id: string, siblingIds: string[]) {
    // Ha a kategória egészben ki volt adva, a tételenkénti jelölésre bontjuk —
    // különben a pipa levétele látszólag nem csinálna semmit.
    if (cats.includes(catId)) {
      setCats(x => x.filter(c => c !== catId));
      setSvcs(x => [...new Set([...x, ...siblingIds])].filter(s => s !== id));
      return;
    }
    setSvcs(x => x.includes(id) ? x.filter(s => s !== id) : [...x, id]);
  }

  const scopeCount = cats.length + svcs.length;

  const save = api.bookable.setDays.useMutation({
    onSuccess: r => {
      void utils.bookable.list.invalidate();
      setMsg(`${r.days} napra kiadva${r.perDay > 1 ? `, naponta ${r.perDay} sávban` : ""}.`);
    },
    onError: e => setMsg(e.message),
  });

  /** A megadott időszak napjai, a kiválasztott hétköznapokra szűrve. */
  function dates(): string[] {
    const out: string[] = [];
    const d   = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    if (isNaN(d.getTime()) || isNaN(end.getTime()) || end < d) return out;
    while (d <= end && out.length < 120) {
      const dow = (d.getDay() + 6) % 7;
      if (weekdays.includes(dow)) out.push(toDateStr(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  const days = dates();

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20,
        padding: "1.6rem 1.8rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "var(--shadow-modal)", animation: "fadeInUp 0.3s ease",
      }}>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.16em", color: "var(--color-teal)", margin: "0 0 0.3rem" }}>
          Foglalható idő ⊞
        </h2>
        <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--text-soft)", fontStyle: "italic", margin: "0 0 1.2rem" }}>
          Ennyit adunk ki online foglalásra. A szünetek kimaradnak, oda nem lehet időpontot kérni.
        </p>

        {workers.length > 1 && (
          <div style={{ marginBottom: "0.9rem" }}>
            <span style={lbl}>Kinek</span>
            <select value={worker} onChange={e => setWorker(e.target.value)} style={field}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.9rem" }}>
          <div>
            <span style={lbl}>Ettől a naptól</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={field} />
          </div>
          <div>
            <span style={lbl}>Eddig</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={field} />
          </div>
        </div>

        <div style={{ marginBottom: "0.9rem" }}>
          <span style={lbl}>Mely napokon</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {DAYS.map((d, i) => {
              const on = weekdays.includes(i);
              return (
                <button key={d} type="button"
                  onClick={() => setWeekdays(w => on ? w.filter(x => x !== i) : [...w, i])}
                  style={{
                    padding: "0.3rem 0.55rem", borderRadius: 7, cursor: "pointer",
                    border: on ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                    background: on ? "var(--bg-active)" : "transparent",
                    color: on ? "var(--color-teal)" : "var(--text-soft)",
                    fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
                  }}>
                  {d.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.9rem" }}>
          <div>
            <span style={lbl}>Naponta ettől</span>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} />
          </div>
          <div>
            <span style={lbl}>Eddig</span>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={field} />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <span style={lbl}>Mire lehet kérni</span>
          <div style={{
            fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
            color: "var(--text-dim)", fontStyle: "italic", marginBottom: "0.45rem",
          }}>
            {scopeCount === 0
              ? "Bármire — ha semmit nem jelölsz, a teljes árlista kérhető erre a sávra."
              : "Csak a bejelölt szolgáltatásokra lehet ide időpontot kérni."}
          </div>

          <div style={{
            maxHeight: 190, overflowY: "auto", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--bg-panel)", padding: "0.3rem",
          }}>
            {categories.map(c => {
              const state = catState(c);
              const open  = openCat === c.id;
              const ids   = c.services.map(s => s.id);
              return (
                <div key={c.id} style={{ marginBottom: "0.15rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <button type="button" onClick={() => toggleCat(c)}
                      style={{
                        flex: 1, textAlign: "left", cursor: "pointer", borderRadius: 7,
                        padding: "0.3rem 0.5rem",
                        border: state === "nincs" ? "1px solid transparent" : "1px solid var(--border-strong)",
                        background: state === "mind" ? "var(--bg-active)" : "transparent",
                        color: state === "nincs" ? "var(--text-soft)" : "var(--color-teal)",
                        fontFamily: "var(--font-cormorant)", fontSize: "0.92rem",
                      }}>
                      {state === "mind" ? "◉" : state === "reszben" ? "◐" : "○"} {c.name}
                      {state === "reszben" && (
                        <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                          {" "}· {c.services.filter(x => svcs.includes(x.id)).length} tétel
                        </span>
                      )}
                    </button>
                    <button type="button" onClick={() => setOpenCat(open ? null : c.id)}
                      title="Tételenként"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-dim)", fontSize: "0.8rem", padding: "0.2rem 0.3rem",
                      }}>
                      {open ? "▴" : "▾"}
                    </button>
                  </div>

                  {open && (
                    <div style={{ paddingLeft: "1.1rem" }}>
                      {c.services.map(sv => {
                        const on = cats.includes(c.id) || svcs.includes(sv.id);
                        return (
                          <button key={sv.id} type="button" onClick={() => toggleSvc(c.id, sv.id, ids)}
                            style={{
                              display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                              background: "none", border: "none", padding: "0.2rem 0.4rem",
                              color: on ? "var(--color-teal)" : "var(--text-dim)",
                              fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
                            }}>
                            {on ? "✓" : "·"} {sv.name}
                            <span style={{ color: "var(--text-dim)" }}> · {sv.duration} perc</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <span style={lbl}>Szünetek</span>
          {breaks.length === 0 && (
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "var(--text-dim)", fontStyle: "italic", marginBottom: "0.4rem" }}>
              Nincs szünet — a teljes sáv foglalható.
            </div>
          )}
          {breaks.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
              <input type="time" value={b.start} style={{ ...field, flex: 1 }}
                onChange={e => setBreaks(bs => bs.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} />
              <span style={{ color: "var(--text-soft)" }}>–</span>
              <input type="time" value={b.end} style={{ ...field, flex: 1 }}
                onChange={e => setBreaks(bs => bs.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} />
              <button type="button" onClick={() => setBreaks(bs => bs.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#c47878", fontSize: "0.9rem" }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setBreaks(bs => [...bs, { start: "12:00", end: "12:30" }])}
            style={{
              background: "none", border: "1px dashed var(--border)", borderRadius: 8,
              padding: "0.3rem 0.7rem", cursor: "pointer", color: "var(--text-soft)",
              fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
            ＋ Szünet
          </button>
        </div>

        <div style={{
          marginBottom: "1rem", padding: "0.5rem 0.75rem", borderRadius: 9,
          background: "var(--bg-panel)", border: "1px solid var(--border)",
          fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--text-soft)",
        }}>
          {days.length === 0
            ? "Ezzel a beállítással egyetlen nap sem esik bele."
            : <>Érintett napok: <strong>{days.length}</strong> · {start}–{end}
                {breaks.length > 0 && <>, szünet: {breaks.map(b => `${b.start}–${b.end}`).join(", ")}</>}
                {scopeCount > 0 && <>, {scopeCount} szolgáltatásra</>}</>}
        </div>

        {msg && (
          <div style={{
            marginBottom: "0.8rem", padding: "0.5rem 0.8rem", borderRadius: 8,
            background: "rgba(82,118,102,0.10)", border: "1px solid rgba(82,118,102,0.35)",
            fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#527666",
          }}>
            {msg}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "0.6rem 1.1rem", borderRadius: 9, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-soft)",
            fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.1em", cursor: "pointer",
          }}>
            Bezárás
          </button>
          <button
            disabled={days.length === 0 || save.isPending}
            onClick={() => { setMsg(""); save.mutate({
              dates: days, workerId: worker, startTime: start, endTime: end, breaks,
              categoryIds: cats, serviceIds: svcs,
            }); }}
            style={{
              padding: "0.6rem 1.4rem", borderRadius: 9, border: "none",
              background: days.length && !save.isPending ? "linear-gradient(120deg,#4a7a6a,#527666,#4a7a6a)" : "var(--bg-card)",
              color: days.length && !save.isPending ? "#fff" : "var(--text-dim)",
              fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.12em",
              cursor: days.length && !save.isPending ? "pointer" : "not-allowed",
            }}>
            {save.isPending ? "Mentés…" : "Kiadás ◈"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
