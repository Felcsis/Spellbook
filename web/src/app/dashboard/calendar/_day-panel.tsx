"use client";

/**
 * A nap oldalsávja a napi nézetben.
 *
 * A napi nézetben egyetlen oszlop van, ezért a nap "bejegyzései" (munkanap,
 * vendégkártya, költség) a szűk egész-napos sávba szorultak, és olvashatatlanná
 * váltak. Itt kapnak rendes helyet, típusonként csoportosítva, a nap
 * összesítőjével együtt.
 */

import { useState } from "react";

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

export type DayEntry = {
  id:    string;
  text:  string;
  sub?:  string;
  amount?: number;
  color: string;
};

export type DaySection = {
  title:   string;
  icon:    string;
  entries: DayEntry[];
  /** Mit írjunk ki, ha üres. Ha nincs megadva, üresen nem jelenik meg a szakasz. */
  empty?:  string;
  /** Ha az üres állapotból tenni is lehet valamit, ez a gomb felirata. */
  emptyAction?: string;
};

export function DayPanel({ sections, revenue, costs, title, onAdd }: {
  sections: DaySection[];
  revenue:  number;
  costs:    number;
  /** A nap felirata az ablak fejlécén. */
  title?:   string;
  onAdd?:   () => void;
}) {
  const [open, setOpen] = useState(true);
  const visible = sections.filter(s => s.entries.length > 0 || s.empty);
  const count   = sections.reduce((n, s) => n + s.entries.length, 0);

  return (
    <div style={{
      border: "1px solid var(--border-strong)", borderRadius: 14,
      background: "var(--bg-card)", boxShadow: "var(--shadow-card)", overflow: "hidden",
    }}>
      {/* Ablak-fejléc */}
      <div onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 0.75rem", cursor: "pointer",
          background: "var(--bg-highlight)", borderBottom: open ? "1px solid var(--border)" : "none",
        }}>
        <span style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--color-teal)",
        }}>
          ◈ A nap bejegyzései
        </span>
        {count > 0 && (
          <span style={{
            fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "var(--text-dim)",
          }}>{count}</span>
        )}
        <div style={{ flex: 1 }} />
        {title && (
          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-dim)" }}>
            {title}
          </span>
        )}
        <span style={{
          color: "var(--text-soft)", fontSize: "0.7rem",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }}>▾</span>
      </div>

      {open && (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.7rem" }}>
      {/* A nap mérlege */}
      <div style={{
        background: "var(--bg-panel)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "0.6rem 0.8rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>
            Bevétel
          </span>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "#7a9e8c", fontWeight: 700 }}>
            {fmt(revenue)}
          </span>
        </div>
        {costs > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.25rem" }}>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>
              Költség
            </span>
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.92rem", color: "#c49060", fontWeight: 700 }}>
              −{fmt(costs)}
            </span>
          </div>
        )}
      </div>

      {visible.map(section => (
        <div key={section.title} style={{
          background: "var(--bg-panel)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "0.6rem 0.8rem",
        }}>
          <div style={{
            fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem",
          }}>
            {section.icon} {section.title}
          </div>

          {section.entries.length === 0 ? (
            <div>
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                {section.empty}
              </div>
              {section.emptyAction && onAdd && (
                <button onClick={onAdd} style={{
                  marginTop: "0.45rem", padding: "0.35rem 0.7rem", borderRadius: 8,
                  border: "1px solid var(--border-strong)", background: "var(--bg-active)",
                  color: "var(--color-teal)", cursor: "pointer",
                  fontFamily: "var(--font-cinzel)", fontSize: "0.52rem",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {section.emptyAction}
                </button>
              )}
            </div>
          ) : section.entries.map(e => (
            <div key={e.id} style={{
              display: "flex", alignItems: "baseline", gap: "0.45rem",
              padding: "0.25rem 0", borderBottom: "1px solid var(--bg-highlight)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {e.text}
                </div>
                {e.sub && (
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.2 }}>
                    {e.sub}
                  </div>
                )}
              </div>
              {e.amount !== undefined && (
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: e.color, fontWeight: 700, flexShrink: 0 }}>
                  {fmt(e.amount)}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {onAdd && (
        <button onClick={onAdd} style={{
          padding: "0.55rem", borderRadius: 10, border: "1px dashed var(--border)",
          background: "transparent", color: "var(--text-soft)", cursor: "pointer",
          fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          ＋ Bejegyzés ehhez a naphoz
        </button>
      )}
    </div>
      )}
    </div>
  );
}
