"use client";

/**
 * A hét bejegyzései a naptár alatt.
 *
 * A heti nézetben a rács a menetrendé (Google-időpontok és előjegyzések), a
 * bejegyzések — munkanap, vendégkártya, anyag, bér — pedig ide kerülnek, hogy
 * ne szorongjanak az "egész nap" sávban.
 */

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

export type WeekDayEntries = {
  key:      string;
  label:    string;         // "Hétfő"
  sub:      string;         // "15"
  isToday:  boolean;
  income:   number;         // munkadíj + anyag, amit a vendégek fizettek
  rows:     { id: string; text: string; sub?: string; amount?: number; color: string }[];
};

export function WeekEntries({ days, onOpenDay }: {
  days: WeekDayEntries[];
  onOpenDay: (key: string) => void;
}) {
  const total = days.reduce((sum, d) => sum + d.income, 0);
  const any   = days.some(d => d.rows.length > 0);

  return (
    <div style={{
      marginTop: "0.8rem", border: "1px solid var(--border)", borderRadius: 16,
      background: "var(--bg-panel)", boxShadow: "var(--shadow-card)", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.5rem 0.8rem", background: "var(--bg-highlight)",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--color-teal)",
        }}>
          ◈ A hét bejegyzései
        </span>
        <div style={{ flex: 1 }} />
        {total > 0 && (
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.92rem", color: "#7a9e8c", fontWeight: 700 }}>
            {fmt(total)}
          </span>
        )}
      </div>

      {!any ? (
        <div style={{
          padding: "0.9rem", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem",
          color: "var(--text-dim)", fontStyle: "italic",
        }}>
          Ezen a héten még nincs rögzített bejegyzés.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map(d => (
            <div key={d.key}
              onClick={() => onOpenDay(d.key)}
              style={{
                borderRight: "1px solid var(--bg-today)", padding: "0.5rem 0.45rem",
                background: d.isToday ? "var(--bg-today)" : "transparent",
                cursor: "pointer", minWidth: 0,
              }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.35rem" }}>
                <span style={{
                  fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--text-dim)",
                }}>{d.label}</span>
                <span style={{
                  fontFamily: "var(--font-playfair)", fontSize: "0.82rem",
                  color: d.isToday ? "var(--color-teal)" : "var(--text-primary)",
                }}>{d.sub}</span>
                <div style={{ flex: 1 }} />
                {d.income > 0 && (
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.68rem", color: "#7a9e8c", fontWeight: 700 }}>
                    {Math.round(d.income / 1000)}k
                  </span>
                )}
              </div>

              {d.rows.length === 0 ? (
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.76rem", color: "var(--border)" }}>—</div>
              ) : d.rows.map(r => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "baseline", gap: "0.3rem",
                  padding: "0.12rem 0", minWidth: 0,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", background: r.color,
                    flexShrink: 0, alignSelf: "center",
                  }} />
                  <span style={{
                    fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-primary)",
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={r.sub ? `${r.text} · ${r.sub}` : r.text}>
                    {r.text}
                  </span>
                  {r.amount !== undefined && r.amount > 0 && (
                    <span style={{
                      fontFamily: "var(--font-playfair)", fontSize: "0.68rem", color: r.color,
                      fontWeight: 700, flexShrink: 0,
                    }}>
                      {Math.round(r.amount / 1000)}k
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
