"use client";

/**
 * Új előjegyzés, illetve meglévő áthelyezése.
 *
 * A szabad időt nem a levegőből vesszük: a dolgozó rögzített munkaideje és a már
 * felvett időpontjai alapján ajánljuk. Ha nincs munkaidő rögzítve, azt megmondjuk
 * — így nem tűnik úgy, mintha a rendszer tudna valamit, amit nem.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { MiniCalendar } from "./_mini-calendar";

const lbl: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.15em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

const input: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DURATIONS = [30, 45, 60, 90, 120, 180];

/** Egy választható szolgáltatás az árlistáról. */
type PickedService = { id: string; name: string; duration: number; category: string };

export function BookingModal({ date, workerId, moveId, onClose }: {
  date:      Date;
  workerId:  string;
  /** Ha meg van adva, egy meglévő időpontot helyezünk át. */
  moveId?:   string;
  onClose:   () => void;
}) {
  const utils = api.useUtils();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: workers = [] }    = api.calendar.users.useQuery();
  const { data: guests = [] }     = api.guests.listGuests.useQuery();
  const { data: categories = [] } = api.services.listCategories.useQuery();

  // A keresés kezdőnapja állítható — nem csak arra a napra foglalhatsz, amire
  // épp kattintottál.
  const [day,      setDay]      = useState(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [worker,   setWorker]   = useState(workerId);
  const [duration, setDuration] = useState(60);
  const [guestId,  setGuestId]  = useState("");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  // Több szolgáltatás is választható (pl. tövfestés + vágás). Az időtartamuk
  // összeadódik, de kézzel felülírható — a valóság nem mindig a lista szerint megy.
  const [picked,      setPicked]      = useState<PickedService[]>([]);
  const [svcSearch,   setSvcSearch]   = useState("");
  const [svcOpen,     setSvcOpen]     = useState(false);
  const [durationSet, setDurationSet] = useState(false);
  const [notes,    setNotes]    = useState("");
  const [slot,     setSlot]     = useState<string | null>(null);
  const [error,    setError]    = useState("");
  const [warning,  setWarning]  = useState("");

  // A kiválasztott dolgozó árlistája dönti el, mely szolgáltatások közül lehet
  // választani — ugyanaz a szabály, mint a bejegyzés rögzítésénél.
  const selectedWorker = workers.find(w => w.id === worker);
  const priceList      = selectedWorker?.priceListType ?? "master";
  const allServices: PickedService[] = [];
  for (const c of categories) {
    if ((c as { priceListType?: string }).priceListType !== priceList) continue;
    for (const sv of (c.services ?? []))
      allServices.push({ id: sv.id, name: sv.name, duration: sv.duration, category: c.name });
  }

  const filteredServices = svcSearch.trim()
    ? allServices.filter(sv =>
        sv.name.toLowerCase().includes(svcSearch.toLowerCase()) ||
        sv.category.toLowerCase().includes(svcSearch.toLowerCase()))
    : allServices;

  // A választott szolgáltatások össz-időtartama, 15 percre felkerekítve.
  const suggestedDuration = picked.length
    ? Math.max(15, Math.ceil(picked.reduce((sum, sv) => sum + (sv.duration || 0), 0) / 15) * 15)
    : 0;

  function addService(sv: PickedService) {
    if (picked.some(p => p.id === sv.id)) return;
    const next = [...picked, sv];
    setPicked(next);
    setSvcSearch("");
    setSvcOpen(false);
    setSlot(null);
    // Amíg kézzel nem nyúltál az időtartamhoz, a lista szerinti idővel megyünk.
    if (!durationSet) {
      const total = next.reduce((sum, x) => sum + (x.duration || 0), 0);
      if (total > 0) setDuration(Math.max(15, Math.ceil(total / 15) * 15));
    }
  }

  function removeService(id: string) {
    const next = picked.filter(p => p.id !== id);
    setPicked(next);
    setSlot(null);
    if (!durationSet) {
      const total = next.reduce((sum, x) => sum + (x.duration || 0), 0);
      if (total > 0) setDuration(Math.max(15, Math.ceil(total / 15) * 15));
    }
  }

  const { data: days = [], isLoading: slotsLoading } = api.appointments.freeSlots.useQuery(
    { workerId: worker, from: toDateStr(day), days: 14, durationMinutes: duration },
    { enabled: Boolean(worker) },
  );

  // A mini naptárban zölddel jelöljük, hol van egyáltalán szabad idő.
  const marked: Record<string, string> = {};
  for (const d of days) marked[d.date] = "#527666";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const done = () => {
    void utils.appointments.list.invalidate();
    void utils.gcal.events.invalidate();
    onClose();
  };

  const create = api.appointments.create.useMutation({
    onSuccess: r => {
      if (r.clash.length > 0) {
        setWarning(`Figyelem: átfedés ${r.clash.map(c => c.guestName).join(", ")} időpontjával. Az időpont így is elmentve.`);
        void utils.appointments.list.invalidate();
        void utils.gcal.events.invalidate();
        return;
      }
      done();
    },
    onError: e => setError(e.message),
  });

  const move = api.appointments.move.useMutation({
    onSuccess: r => {
      if (r.clash.length > 0) {
        setWarning(`Figyelem: átfedés ${r.clash.map(c => c.guestName).join(", ")} időpontjával. Az áthelyezés így is megtörtént.`);
        void utils.appointments.list.invalidate();
        void utils.gcal.events.invalidate();
        return;
      }
      done();
    },
    onError: e => setError(e.message),
  });

  const busy = create.isPending || move.isPending;
  const canSave = Boolean(slot) && (moveId ? true : name.trim().length > 0);

  function save() {
    if (!slot || busy) return;
    setError(""); setWarning("");
    if (moveId) {
      move.mutate({ id: moveId, start: slot, durationMinutes: duration, workerId: worker });
    } else {
      create.mutate({
        workerId: worker,
        guestId:  guestId || undefined,
        guestName: name.trim(),
        phone:     phone.trim() || undefined,
        start:     slot,
        durationMinutes: duration,
        services:  picked.map(p => p.name).join(", ") || undefined,
        notes:     notes.trim() || undefined,
      });
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20,
        padding: "1.75rem 2rem", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "var(--shadow-modal)", animation: "fadeInUp 0.3s ease",
      }}>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.9rem", letterSpacing: "0.16em", color: "var(--color-teal)", margin: "0 0 1.25rem" }}>
          {moveId ? "Időpont áthelyezése ✦" : "Új időpont ✦"}
        </h2>

        {!moveId && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <span style={lbl}>Vendég</span>
              <input list="guest-options" value={name}
                onChange={e => {
                  setName(e.target.value);
                  const hit = guests.find(g => g.name.toLowerCase() === e.target.value.toLowerCase());
                  setGuestId(hit?.id ?? "");
                  if (hit?.phone) setPhone(hit.phone);
                }}
                placeholder="Név…" style={input} />
              <datalist id="guest-options">
                {guests.map(g => <option key={g.id} value={g.name} />)}
              </datalist>
            </div>
            <div>
              <span style={lbl}>Telefon</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nem kötelező" style={input} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <span style={lbl}>Dolgozó</span>
            <select value={worker}
              onChange={e => { setWorker(e.target.value); setSlot(null); setPicked([]); }}
              style={input}>
              {workers.filter(w => w.active !== false).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={lbl}>
              Időtartam
              {suggestedDuration > 0 && duration !== suggestedDuration && (
                <button type="button" onClick={() => { setDuration(suggestedDuration); setDurationSet(false); setSlot(null); }}
                  style={{ marginLeft: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--color-teal)", fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.08em", textTransform: "none" }}>
                  (lista szerint {suggestedDuration} p)
                </button>
              )}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => { setDuration(d); setDurationSet(true); setSlot(null); }}
                  style={{
                    padding: "0.3rem 0.55rem", borderRadius: 7, cursor: "pointer",
                    border: duration === d ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                    background: duration === d ? "var(--bg-active)" : "transparent",
                    color: duration === d ? "var(--color-teal)" : "var(--text-soft)",
                    fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
                  }}>
                  {d >= 60 ? `${d / 60} ó` : `${d}p`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!moveId && (
          <div style={{ marginBottom: "1rem" }}>
            <span style={lbl}>Mit csinálunk? (nem kötelező)</span>

            {picked.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
                {picked.map(sv => (
                  <span key={sv.id} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.22rem 0.5rem", borderRadius: 999,
                    border: "1px solid var(--border-strong)", background: "var(--bg-active)",
                    color: "var(--color-teal)", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem",
                  }}>
                    {sv.name}
                    {sv.duration > 0 && (
                      <span style={{ opacity: 0.6, fontSize: "0.76rem" }}>{sv.duration}p</span>
                    )}
                    <button type="button" onClick={() => removeService(sv.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.65, padding: 0, fontSize: "0.72rem", lineHeight: 1 }}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ position: "relative" }}>
              <input value={svcSearch}
                onChange={e => { setSvcSearch(e.target.value); setSvcOpen(true); }}
                onFocus={() => setSvcOpen(true)}
                onBlur={() => setTimeout(() => setSvcOpen(false), 150)}
                placeholder={picked.length ? "Még egy szolgáltatás…" : "Keress az árlistán…"}
                style={input} />

              {svcOpen && filteredServices.length > 0 && (
                <div style={{
                  position: "absolute", left: 0, right: 0, zIndex: 300,
                  background: "var(--bg-dropdown)", border: "1px solid var(--border)",
                  borderRadius: 12, marginTop: "0.25rem", maxHeight: 220, overflowY: "auto",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                }}>
                  {filteredServices.map((sv, i) => {
                    const already = picked.some(p => p.id === sv.id);
                    const newCat  = i === 0 || filteredServices[i - 1]?.category !== sv.category;
                    return (
                      <div key={sv.id}>
                        {newCat && (
                          <div style={{
                            padding: "0.4rem 0.85rem 0.15rem", fontFamily: "var(--font-cinzel)",
                            fontSize: "0.46rem", letterSpacing: "0.14em", color: "var(--text-dim)",
                            textTransform: "uppercase",
                          }}>{sv.category}</div>
                        )}
                        <div onMouseDown={() => addService(sv)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "0.42rem 0.85rem", cursor: already ? "default" : "pointer",
                            opacity: already ? 0.4 : 1,
                          }}
                          onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          {already && <span style={{ color: "var(--color-teal)", fontSize: "0.7rem" }}>✓</span>}
                          <span style={{ flex: 1, fontFamily: "var(--font-cormorant)", fontSize: "0.98rem", color: "var(--text-primary)" }}>
                            {sv.name}
                          </span>
                          {sv.duration > 0 && (
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                              {sv.duration} p
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", marginBottom: "1rem", alignItems: "start" }}>
          <div>
            <span style={lbl}>Mikortól keressünk</span>
            <MiniCalendar selected={day} minDate={today} marked={marked}
              onSelect={d => { setDay(d); setSlot(null); }} />
            <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#527666", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.76rem", color: "var(--text-dim)" }}>
                van szabad idő
              </span>
            </div>
          </div>

          <div>
          <span style={lbl}>Szabad időpontok</span>
          {slotsLoading ? (
            <p style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-dim)", margin: 0 }}>Keresem…</p>
          ) : days.length === 0 ? (
            <p style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)", fontStyle: "italic", margin: 0, fontSize: "0.92rem" }}>
              Nincs szabad idő a választott naptól számított két hétben. Ez akkor is előfordul, ha a dolgozónak
              nincs rögzítve munkaideje ezekre a napokra — a naptárban add meg az érkezést és
              a távozást, és utána itt megjelennek az időpontok.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 220, overflowY: "auto" }}>
              {days.map(d => (
                <div key={d.date}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    {new Date(`${d.date}T12:00:00`).toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {d.slots.map(s => {
                      const active = slot === s.start;
                      return (
                        <button key={s.start} type="button" onClick={() => setSlot(s.start)}
                          style={{
                            padding: "0.28rem 0.6rem", borderRadius: 7, cursor: "pointer",
                            border: active ? "1px solid var(--color-teal)" : "1px solid var(--border)",
                            background: active ? "var(--bg-active)" : "transparent",
                            color: active ? "var(--color-teal)" : "var(--text-soft)",
                            fontFamily: "var(--font-playfair)", fontSize: "0.86rem",
                            boxShadow: active ? "0 0 10px var(--color-teal-dim)" : "none",
                          }}>
                          {new Date(s.start).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {!moveId && (
          <div style={{ marginBottom: "1rem" }}>
            <span style={lbl}>Megjegyzés</span>
            <input value={notes} onChange={e => setNotes(e.target.value)} style={input} />
          </div>
        )}

        {warning && (
          <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.8rem", borderRadius: 8, background: "rgba(200,168,64,0.12)", border: "1px solid rgba(200,168,64,0.4)", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--color-teal)" }}>
            {warning}
            <button onClick={done} style={{ marginLeft: "0.5rem", background: "none", border: "none", color: "var(--color-teal)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Rendben
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.8rem", borderRadius: 8, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#c47878" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.6rem 1.1rem", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-soft)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.1em", cursor: "pointer" }}>
            Mégsem
          </button>
          <button onClick={save} disabled={!canSave || busy}
            style={{
              padding: "0.6rem 1.4rem", borderRadius: 9, border: "none",
              background: canSave && !busy ? "linear-gradient(120deg,#4a7a6a,#527666,#4a7a6a)" : "var(--bg-card)",
              color: canSave && !busy ? "#fff" : "var(--text-dim)",
              fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em",
              cursor: canSave && !busy ? "pointer" : "not-allowed",
            }}>
            {busy ? "Mentés…" : moveId ? "Áthelyezés ◈" : "Foglalás ◈"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
