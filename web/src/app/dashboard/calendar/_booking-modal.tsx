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

  const { data: workers = [] } = api.calendar.users.useQuery();
  const { data: guests = [] }  = api.guests.listGuests.useQuery();

  const [worker,   setWorker]   = useState(workerId);
  const [duration, setDuration] = useState(60);
  const [guestId,  setGuestId]  = useState("");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [services, setServices] = useState("");
  const [notes,    setNotes]    = useState("");
  const [slot,     setSlot]     = useState<string | null>(null);
  const [error,    setError]    = useState("");
  const [warning,  setWarning]  = useState("");

  const { data: days = [], isLoading: slotsLoading } = api.appointments.freeSlots.useQuery(
    { workerId: worker, from: toDateStr(date), days: 7, durationMinutes: duration },
    { enabled: Boolean(worker) },
  );

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
        services:  services.trim() || undefined,
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
            <select value={worker} onChange={e => { setWorker(e.target.value); setSlot(null); }} style={input}>
              {workers.filter(w => w.active !== false).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={lbl}>Időtartam</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => { setDuration(d); setSlot(null); }}
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
            <input value={services} onChange={e => setServices(e.target.value)} placeholder="pl. tövfestés + vágás" style={input} />
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <span style={lbl}>Szabad időpontok</span>
          {slotsLoading ? (
            <p style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-dim)", margin: 0 }}>Keresem…</p>
          ) : days.length === 0 ? (
            <p style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)", fontStyle: "italic", margin: 0, fontSize: "0.92rem" }}>
              Nincs szabad idő a következő egy hétben. Ez akkor is előfordul, ha a dolgozónak
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
