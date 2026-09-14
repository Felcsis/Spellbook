"use client";

/**
 * A nap oldalsávja a napi nézetben.
 *
 * A napi nézetben egyetlen oszlop van, ezért a nap "bejegyzései" (munkanap,
 * vendégkártya, költség) a szűk egész-napos sávba szorultak, és olvashatatlanná
 * váltak. Itt kapnak rendes helyet, típusonként csoportosítva, a nap
 * összesítőjével együtt.
 */

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
};

export function DayPanel({ sections, revenue, costs, onAdd }: {
  sections: DaySection[];
  revenue:  number;
  costs:    number;
  onAdd?:   () => void;
}) {
  const visible = sections.filter(s => s.entries.length > 0 || s.empty);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* A nap mérlege */}
      <div style={{
        background: "var(--bg-panel)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "0.75rem 0.9rem",
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
          borderRadius: 14, padding: "0.7rem 0.9rem",
        }}>
          <div style={{
            fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem",
          }}>
            {section.icon} {section.title}
          </div>

          {section.entries.length === 0 ? (
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "var(--text-dim)", fontStyle: "italic" }}>
              {section.empty}
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
  );
}
