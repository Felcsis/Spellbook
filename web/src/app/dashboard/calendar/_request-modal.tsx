"use client";

/**
 * Foglalási kérés elbírálása.
 *
 * A kártyán lévő apró gombok helyett egy rendes ablak: itt látszik a vendég
 * elérhetősége és a megjegyzése is, amit a kis kártyára nem fért ki — pedig
 * épp az alapján lehet eldönteni, belefér-e.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";

export type RequestDetails = {
  id:         string;
  guestName:  string;
  service:    string;
  phone:      string;
  email:      string;
  note:       string | null;
  start:      string;
  end:        string;
  workerName: string;
};

export function RequestModal({ request, onClose, onDone }: {
  request: RequestDetails;
  onClose: () => void;
  onDone:  (msg: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode,   setMode]   = useState<null | "decline" | "propose">(null);
  const [reason, setReason] = useState("");
  const [error,  setError]  = useState("");

  const accept = api.bookings.accept.useMutation({
    onSuccess: () => onDone(`${request.guestName} időpontja elfogadva — bekerült a naptárba, és értesítést kapott.`),
    onError:   e => setError(e.message),
  });
  const decline = api.bookings.decline.useMutation({
    onSuccess: () => onDone(mode === "propose"
      ? `Elküldtük ${request.guestName}-nak a javaslatot.`
      : `${request.guestName} kérése elutasítva — értesítést kapott.`),
    onError:   e => setError(e.message),
  });

  const busy = accept.isPending || decline.isPending;

  const when = new Date(request.start).toLocaleString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
    weekday: "long", hour: "2-digit", minute: "2-digit",
  });
  const till = new Date(request.end).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20,
        padding: "1.6rem 1.8rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "var(--shadow-modal)", animation: "fadeInUp 0.3s ease",
      }}>
        <div style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em",
          textTransform: "uppercase", color: "#8a6a20", marginBottom: "0.35rem",
        }}>
          ✦ Foglalási kérés
        </div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "1.45rem", color: "var(--color-teal)", margin: "0 0 1rem", fontWeight: 400 }}>
          {request.guestName}
        </h2>

        <div style={{
          padding: "0.8rem 1rem", borderRadius: 12, marginBottom: "1.1rem",
          background: "var(--bg-panel)", border: "1px solid var(--border)",
          fontFamily: "var(--font-cormorant)", fontSize: "0.98rem",
        }}>
          <Row label="Mikor"  value={`${when} – ${till}`} />
          <Row label="Mit"    value={request.service} />
          <Row label="Kihez"  value={request.workerName} />
          <Row label="Telefon" value={request.phone} />
          <Row label="E-mail"  value={request.email} />
          {request.note && <Row label="Üzenet" value={request.note} />}
        </div>

        {mode === null && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button onClick={() => { setError(""); accept.mutate({ id: request.id }); }} disabled={busy} style={primary}>
              {accept.isPending ? "Mentés…" : "✓ Elfogadom"}
            </button>
            <button onClick={() => { setError(""); setMode("propose"); }} disabled={busy} style={ghost}>
              ⇄ Másik időpontot ajánlok
            </button>
            <button onClick={() => { setError(""); setMode("decline"); }} disabled={busy} style={{ ...ghost, color: "#c47878", borderColor: "rgba(196,120,120,0.45)" }}>
              ✕ Elutasítom
            </button>
          </div>
        )}

        {mode === "propose" && (
          <div>
            <label style={label}>Mikor tudnád fogadni?</label>
            <input value={reason} onChange={e => setReason(e.target.value)} autoFocus
              placeholder="pl. szerdán 15:00, vagy csütörtök délelőtt bármikor"
              style={field} />
            <p style={hint}>
              Ezt a szöveget küldjük el neki. A vendég ez alapján tud új időpontot kérni —
              a mostani kérése lezárul.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
              <button onClick={() => setMode(null)} style={ghost}>Vissza</button>
              <button
                disabled={busy || !reason.trim()}
                onClick={() => decline.mutate({ id: request.id, reason: `Helyette ezt tudjuk ajánlani: ${reason.trim()}` })}
                style={{ ...primary, flex: 1 }}>
                {decline.isPending ? "Küldés…" : "Javaslat elküldése"}
              </button>
            </div>
          </div>
        )}

        {mode === "decline" && (
          <div>
            <label style={label}>Indoklás (nem kötelező)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} autoFocus
              placeholder="pl. aznap sajnos tele vagyunk" style={field} />
            <p style={hint}>Udvarias levelet küldünk neki, és a sáv felszabadul.</p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
              <button onClick={() => setMode(null)} style={ghost}>Vissza</button>
              <button
                disabled={busy}
                onClick={() => decline.mutate({ id: request.id, reason: reason.trim() || undefined })}
                style={{ ...primary, flex: 1, background: "#c47878" }}>
                {decline.isPending ? "Küldés…" : "Elutasítás"}
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

const primary: React.CSSProperties = {
  padding: "0.7rem 1.2rem", borderRadius: 10, border: "none", cursor: "pointer",
  background: "linear-gradient(120deg,#4a7a6a,#527666,#4a7a6a)", color: "#fff",
  fontFamily: "var(--font-cormorant)", fontSize: "1.18rem", fontWeight: 600,
  letterSpacing: "0.01em", lineHeight: 1.3,
};

const ghost: React.CSSProperties = {
  padding: "0.7rem 1.2rem", borderRadius: 10, cursor: "pointer",
  border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1.18rem", fontWeight: 600,
  letterSpacing: "0.01em", lineHeight: 1.3,
};

const label: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

const field: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

const hint: React.CSSProperties = {
  fontFamily: "var(--font-cormorant)", fontSize: "0.85rem",
  color: "var(--text-dim)", fontStyle: "italic", margin: "0.4rem 0 0",
};
