"use client";

/** A statisztika fülek közös építőelemei. */

export function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase" }}>
        ◈ {children}
      </div>
      {hint && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--text-soft)", fontStyle: "italic", marginTop: "0.25rem" }}>{hint}</div>}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem 1.25rem", ...style }}>
      {children}
    </div>
  );
}

export function Tiles({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      {items.map(({ label, value, sub }) => (
        <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.25rem", flex: "1 1 140px", minWidth: 120 }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "var(--color-teal)", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "var(--text-soft)", marginTop: "0.2rem", fontStyle: "italic" }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

export const th: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.12em", textTransform: "uppercase",
  color: "var(--text-muted)", fontWeight: 400, textAlign: "right", padding: "0.4rem 0.5rem", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
};
export const td: React.CSSProperties = {
  fontFamily: "var(--font-cormorant)", fontSize: "0.98rem", color: "var(--text-primary)",
  textAlign: "right", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
};
export const tdLeft: React.CSSProperties = { ...td, textAlign: "left", whiteSpace: "normal" };

/** Görgethető táblázat-keret, hogy telefonon se lógjon ki az oldalból. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ overflowX: "auto", margin: "0 -0.25rem" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table></div>;
}

/** Vékony, egyszínű sáv egy cellában — nagyság, nem azonosság. */
export function InlineBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--stat-a)", borderRadius: 4 }} />
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div style={{ display: "flex", gap: "0.3rem", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 9, padding: "0.2rem", flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          style={{ padding: "0.35rem 0.8rem", borderRadius: 7, border: "none", background: value === o.key ? "var(--bg-active)" : "transparent", color: value === o.key ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.1em", cursor: "pointer" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
