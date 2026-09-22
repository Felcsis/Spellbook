"use client";

/**
 * Húzás után: mire adjuk ki ezt a sávot?
 *
 * A húzás eddig azonnal mentett, és a szűrést csak a kézi ablakban lehetett
 * megadni — aki húzással dolgozott, nem is tudta, hogy van ilyen. Az ablak
 * ezért egy kattintással elengedhető: a „Mentés így” a régi viselkedés.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { EMPTY_SCOPE, ScopePicker, scopeCount, type Scope } from "./_scope-picker";

export type PendingWindow = {
  date:      string;   // "YYYY-MM-DD"
  workerId:  string;
  startTime: string;   // "HH:MM"
  endTime:   string;
  workerName?: string;
  /** A dolgozó árlistája — csak az ő tételeit kínáljuk fel. */
  listType?: string;
};

export function WindowScopeModal({ pending, onClose, onSaved }: {
  pending: PendingWindow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);
  const [err,   setErr]   = useState("");

  const add = api.bookable.add.useMutation({
    onSuccess: () => { onSaved(); onClose(); },
    onError:   e => setErr(e.message),
  });

  function save() {
    setErr("");
    add.mutate({
      date:      pending.date,
      workerId:  pending.workerId,
      startTime: pending.startTime,
      endTime:   pending.endTime,
      categoryIds: scope.cats,
      serviceIds:  scope.svcs,
    });
  }

  if (!mounted) return null;

  const n = scopeCount(scope);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20,
        padding: "1.5rem 1.6rem", width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto",
        boxShadow: "var(--shadow-modal)", animation: "fadeInUp 0.25s ease",
      }}>
        <h2 style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.8rem", letterSpacing: "0.16em",
          color: "var(--color-teal)", margin: "0 0 0.3rem",
        }}>
          Foglalható sáv ⊞
        </h2>

        <p style={{
          fontFamily: "var(--font-cormorant)", fontSize: "0.95rem",
          color: "var(--text-soft)", margin: "0 0 1rem",
        }}>
          {pending.workerName ? `${pending.workerName} · ` : ""}
          {pending.date} · <strong>{pending.startTime}–{pending.endTime}</strong>
        </p>

        <span style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em",
          textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem",
        }}>
          Mire lehet kérni
        </span>
        <div style={{
          fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
          color: "var(--text-dim)", fontStyle: "italic", marginBottom: "0.45rem",
        }}>
          {n === 0
            ? "Ha semmit nem jelölsz, a teljes árlista kérhető erre a sávra."
            : `Csak a bejelölt ${n} szolgáltatásra lehet ide időpontot kérni.`}
        </div>

        <ScopePicker listType={pending.listType} value={scope} onChange={setScope} maxHeight={220} />

        {err && (
          <div style={{
            marginTop: "0.8rem", padding: "0.5rem 0.8rem", borderRadius: 8,
            background: "rgba(200,80,80,0.10)", border: "1px solid rgba(200,80,80,0.35)",
            fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--color-danger)",
          }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "1.1rem" }}>
          <button onClick={onClose} style={{
            padding: "0.6rem 1rem", borderRadius: 9, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-soft)",
            fontFamily: "var(--font-cinzel)", fontSize: "0.54rem", letterSpacing: "0.1em", cursor: "pointer",
          }}>
            Mégse
          </button>
          <button
            disabled={add.isPending}
            onClick={save}
            style={{
              padding: "0.6rem 1.3rem", borderRadius: 9, border: "none",
              background: add.isPending ? "var(--bg-card)" : "linear-gradient(120deg,#4a7a6a,#527666,#4a7a6a)",
              color: add.isPending ? "var(--text-dim)" : "#fff",
              fontFamily: "var(--font-cinzel)", fontSize: "0.54rem", letterSpacing: "0.12em",
              cursor: add.isPending ? "not-allowed" : "pointer",
            }}>
            {add.isPending ? "Mentés…" : n === 0 ? "Mentés így ◈" : `Mentés · ${n} szolgáltatás ◈`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
