"use client";

/**
 * A kiválasztott szolgáltatás ára a kártyán — átírható.
 *
 * Az árlistabeli ár csak kiindulópont: egy szolgáltatás mellé kért vágás
 * több vagy kevesebb munka is lehet, és az ár ehhez igazodik. Eddig csak
 * kedvezményt lehetett adni, ezért a drágább vágást egy másik (férfi) tétellel
 * vették fel — ami a statisztikát is elrontotta.
 */
export function PriceInput({ value, listPrice, onChange }: {
  value: number;
  listPrice?: number;
  onChange: (price: number) => void;
}) {
  const changed = listPrice !== undefined && value !== listPrice;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      <input
        type="number" min="0" step="100"
        value={value}
        onChange={e => onChange(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
        onFocus={e => e.target.select()}
        title="Ár — a munka szerint átírható"
        style={{
          width: 78, background: "var(--bg-card)", border: `1px solid ${changed ? "var(--color-teal)" : "var(--border)"}`,
          borderRadius: 6, padding: "0.18rem 0.4rem", color: "var(--text-primary)",
          fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", textAlign: "right", outline: "none",
        }}
      />
      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)" }}>Ft</span>
      {changed && (
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", fontStyle: "italic" }}>
          (árlista: {listPrice.toLocaleString("hu-HU")})
        </span>
      )}
    </span>
  );
}
