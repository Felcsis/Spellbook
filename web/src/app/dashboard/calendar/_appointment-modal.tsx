"use client";

/**
 * Egy előjegyzés részletei és műveletei.
 *
 * A kártyán csak a név és az idő fér el; a telefonszám és a megjegyzés viszont
 * épp akkor kell, amikor a vendéggel egyeztetnél — ezért nyílik ablak.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";

export type AppointmentDetails = {
  id:         string;
  guestName:  string;
  services:   string | null;
  phone:      string | null;
  notes:      string | null;
  start:      string;
  end:        string;
  workerName: string;
};

export function AppointmentModal({ appointment, onClose, onMove, onDone }: {
  appointment: AppointmentDetails;
  onClose: () => void;
  /** Áthelyezés: a naptár nyitja meg a foglalás-ablakot. */
  onMove:  () => void;
  onDone:  (msg: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [mode, setMode] = useState<null | "cancel" | "notice">(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cancel = api.appointments.cancel.useMutation({
    onSuccess: () => onDone(`${appointment.guestName} időpontja lemondva.`),
    onError:   e => setError(e.message),
  });

  // Ha közbejön valami: a vendég ne csak azt lássa, hogy eltűnt az időpontja.
  const notify = api.appointments.cancelWithNotice.useMutation({
    onSuccess: r => onDone(r.emailed
      ? `Lemondva — ${appointment.guestName} megkapta az értesítést.`
      : r.hasEmail
        ? `Lemondva, de a levél nem ment el. Hívd fel: ${appointment.phone ?? "—"}`
        : `Lemondva. Nincs e-mail címünk hozzá, hívd fel: ${appointment.phone ?? "—"}`),
    onError: e => setError(e.message),
  });

  const when = new Date(appointment.start).toLocaleString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
    weekday: "long", hour: "2-digit", minute: "2-digit",
  });
  const till = new Date(appointment.end).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20,
        padding: "1.6rem 1.8rem", width: "100%", maxWidth: 460,
        boxShadow: "var(--shadow-modal)", animation: "fadeInUp 0.3s ease",
      }}>
        <div style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.35rem",
        }}>
          ✦ Időpont
        </div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "1.45rem", color: "var(--color-teal)", margin: "0 0 1rem", fontWeight: 400 }}>
          {appointment.guestName}
        </h2>

        <div style={{
          padding: "0.8rem 1rem", borderRadius: 12, marginBottom: "1.1rem",
          background: "var(--bg-panel)", border: "1px solid var(--border)",
          fontFamily: "var(--font-cormorant)", fontSize: "0.98rem",
        }}>
          <Row label="Mikor" value={`${when} – ${till}`} />
          {appointment.services && <Row label="Mit"   value={appointment.services} />}
          <Row label="Kihez" value={appointment.workerName} />
          {appointment.phone && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.22rem 0" }}>
              <span style={{ color: "var(--text-dim)" }}>Telefon</span>
              <a href={`tel:${appointment.phone.replace(/\s/g, "")}`}
                style={{ color: "var(--color-teal)", textDecoration: "none", fontWeight: 700 }}>
                {appointment.phone}
              </a>
            </div>
          )}
          {appointment.notes && <Row label="Megjegyzés" value={appointment.notes} />}
        </div>

        {mode === null && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button onClick={onMove} style={ghost}>⇄ Áthelyezem</button>
            <button onClick={() => { setError(""); setMode("notice"); }} style={ghost}>
              ✉ Közbejött valami — értesítem
            </button>
            <button onClick={() => { setError(""); setMode("cancel"); }}
              style={{ ...ghost, color: "#c47878", borderColor: "rgba(196,120,120,0.45)" }}>
              ✕ Lemondom, szólok neki magam
            </button>
          </div>
        )}

        {mode === "notice" && (
          <div>
            <label style={{
              fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
            }}>
              Mit írjunk neki?
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} autoFocus rows={3}
              placeholder="pl. Sajnos lebetegedtem. Szerdán 10:00-kor vagy csütörtök délután bármikor tudnálak fogadni."
              style={{
                width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9, resize: "vertical",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
                outline: "none", boxSizing: "border-box",
              }} />
            <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic", margin: "0.4rem 0 0" }}>
              Az időpont lemondásra kerül, és a vendég levelet kap az okkal meg a felajánlott
              lehetőséggel. Írj bele konkrét időpontot — abból tud választani.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
              <button onClick={() => setMode(null)} style={ghost}>Vissza</button>
              <button disabled={notify.isPending || message.trim().length < 3}
                onClick={() => notify.mutate({ id: appointment.id, message: message.trim() })}
                style={{ ...ghost, flex: 1, background: "rgba(82,118,102,0.16)", color: "#527666", borderColor: "#527666" }}>
                {notify.isPending ? "Küldés…" : "Lemondás és értesítés"}
              </button>
            </div>
          </div>
        )}

        {mode === "cancel" && (
          <div>
            <p style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)", margin: "0 0 0.7rem" }}>
              Lemondod {appointment.guestName} időpontját <strong>értesítés nélkül</strong>?
              A vendéggel neked kell felvenned a kapcsolatot.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setMode(null)} style={ghost}>Mégsem</button>
              <button disabled={cancel.isPending}
                onClick={() => cancel.mutate({ id: appointment.id })}
                style={{ ...ghost, flex: 1, background: "rgba(196,120,120,0.14)", color: "#c47878", borderColor: "#c47878" }}>
                {cancel.isPending ? "Lemondás…" : "Igen, lemondom"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "0.8rem", padding: "0.5rem 0.8rem", borderRadius: 8,
            background: "rgba(196,120,120,0.12)", border: "1px solid rgba(196,120,120,0.4)",
            fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#c47878" }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={onClose} style={{
          marginTop: "1rem", width: "100%", background: "none", border: "none",
          color: "var(--text-dim)", cursor: "pointer",
          fontFamily: "var(--font-cormorant)", fontSize: "1.05rem",
        }}>
          Bezárás
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.22rem 0" }}>
      <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

const ghost: React.CSSProperties = {
  padding: "0.7rem 1.2rem", borderRadius: 10, cursor: "pointer",
  border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1.18rem", fontWeight: 600,
  letterSpacing: "0.01em", lineHeight: 1.3,
};
