"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

const TYPE_CONFIG = {
  revenue:  { label: "Bevétel",       color: "#6ee7b7", dim: "rgba(110,231,183,0.15)", icon: "◈" },
  material: { label: "Anyagköltség",  color: "#fbbf24", dim: "rgba(251,191,36,0.15)",  icon: "✦" },
  wage:     { label: "Bér",           color: "#a78bfa", dim: "rgba(167,139,250,0.15)", icon: "♦" },
} as const;

type EntryType = keyof typeof TYPE_CONFIG;

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

function SummaryCard({ label, value, color, icon, sub }: { label: string; value: number; color: string; icon: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${color}44`,
        borderRadius: "16px",
        padding: "1.5rem 1.75rem",
        backdropFilter: "blur(16px)",
        flex: "1 1 180px",
        minWidth: 160,
        transition: "transform 0.25s, box-shadow 0.25s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.35), 0 0 20px ${color}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <span style={{ color, fontSize: "1.1rem", filter: `drop-shadow(0 0 6px ${color}88)` }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `${color}cc` }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.6rem", color, fontWeight: 700, lineHeight: 1 }}>
        {fmt(value)}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)", marginTop: "0.3rem", fontStyle: "italic" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function AddModal({ onClose, year, month }: { onClose: () => void; year: number; month: number }) {
  const utils = api.useUtils();
  const [type, setType]   = useState<EntryType>("revenue");
  const [date, setDate]   = useState(() => new Date(year, month - 1, new Date().getDate()).toISOString().slice(0, 10));

  // Non-material fields
  const [description, setDesc]        = useState("");
  const [amount, setAmount]           = useState("");
  const [amountManual, setAmountManual] = useState(false);
  const [svcOpen, setSvcOpen]         = useState(false);

  // Material multi-select — qty × unitPrice = lineTotal
  type SelMat = { id: string; name: string; unitPrice: number; description: string | null; qty: string };
  const [matSearch, setMatSearch]     = useState("");
  const [matOpen, setMatOpen]         = useState(false);
  const [selectedMats, setSelectedMats] = useState<SelMat[]>([]);

  const { data: categories = [] } = api.services.listCategories.useQuery();

  const allServices: { id: string; name: string; price: number; description: string | null; categoryName: string }[] = [];
  for (const c of categories) {
    for (const s of (c.services ?? [])) {
      allServices.push({ id: s.id, name: s.name, price: s.price, description: s.description ?? null, categoryName: c.name });
    }
  }

  const filteredSvc = description.trim()
    ? allServices.filter(s => s.name.toLowerCase().includes(description.toLowerCase()) || s.categoryName.toLowerCase().includes(description.toLowerCase()))
    : allServices;

  const filteredMat = matSearch.trim()
    ? allServices.filter(s => s.name.toLowerCase().includes(matSearch.toLowerCase()) || s.categoryName.toLowerCase().includes(matSearch.toLowerCase()))
    : allServices;

  function lineTotal(m: SelMat) {
    const q = parseFloat(m.qty);
    return isNaN(q) || q <= 0 ? 0 : q * m.unitPrice;
  }
  const matTotal = selectedMats.reduce((s, m) => s + lineTotal(m), 0);

  const create = api.finance.create.useMutation({
    onSuccess: async () => { await utils.finance.list.invalidate(); onClose(); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "material") {
      if (selectedMats.length === 0) return;
      const desc = selectedMats
        .map(m => { const q = parseFloat(m.qty); return isNaN(q) ? m.name : `${m.name} (${q}×)`; })
        .join(", ");
      create.mutate({ type, description: desc, amount: matTotal, date });
    } else {
      create.mutate({ type, description, amount: parseFloat(amount), date });
    }
  }

  function addMat(s: { id: string; name: string; price: number; description: string | null }) {
    if (!selectedMats.find(m => m.id === s.id))
      setSelectedMats(prev => [...prev, { id: s.id, name: s.name, unitPrice: s.price, description: s.description, qty: "1" }]);
    setMatSearch(""); setMatOpen(false);
  }

  function removeMat(id: string) { setSelectedMats(prev => prev.filter(m => m.id !== id)); }
  function updateQty(id: string, qty: string) { setSelectedMats(prev => prev.map(m => m.id === id ? { ...m, qty } : m)); }

  const cfg = TYPE_CONFIG[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--bg-modal)",
          border: "1px solid rgba(122,124,58,0.25)",
          borderRadius: "20px",
          padding: "2.25rem 2.5rem",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          animation: "fadeInUp 0.3s ease",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1rem", letterSpacing: "0.16em", color: "var(--color-teal)", marginBottom: "1.75rem" }}>
          ✦ Új tétel hozzáadása
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Type selector */}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG[EntryType]][]).map(([key, c]) => (
              <button key={key} type="button" onClick={() => setType(key)}
                style={{ flex: 1, padding: "0.6rem 0.5rem", borderRadius: "8px", border: type === key ? `1px solid ${c.color}88` : "1px solid var(--bg-active)", background: type === key ? c.dim : "transparent", color: type === key ? c.color : "var(--text-soft)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* ── MATERIAL type: multi-picker ── */}
          {type === "material" && (
            <div>
              <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(74,124,126,0.6)", display: "block", marginBottom: "0.5rem" }}>
                Felhasznált anyagok
              </label>

              {/* Selected materials */}
              {selectedMats.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.65rem" }}>
                  {selectedMats.map(m => {
                    const total = lineTotal(m);
                    return (
                      <div key={m.id} style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: "10px", padding: "0.6rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                          {m.description && <span style={{ fontSize: "0.72rem", color: "rgba(251,191,36,0.45)", fontStyle: "italic" }}>{m.description}</span>}
                          <button type="button" onClick={() => removeMat(m.id)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="number" value={m.qty} min="0" step="any"
                            onChange={e => updateQty(m.id, e.target.value)}
                            style={{ ...inputStyle, width: 72, padding: "0.35rem 0.5rem", fontSize: "0.9rem", textAlign: "center" }}
                          />
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--text-soft)" }}>×</span>
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "rgba(251,191,36,0.7)" }}>{fmt(m.unitPrice)}</span>
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "rgba(44,36,32,0.35)" }}>=</span>
                          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: "#fbbf24", fontWeight: 700, marginLeft: "auto" }}>{fmt(total)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0.5rem 0", borderTop: "1px solid rgba(251,191,36,0.15)" }}>
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.14em", color: "rgba(251,191,36,0.5)" }}>ÖSSZESEN</span>
                    <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: "#fbbf24", fontWeight: 700 }}>{fmt(matTotal)}</span>
                  </div>
                </div>
              )}

              {/* Search + dropdown */}
              <div style={{ position: "relative" }}>
                <input
                  value={matSearch}
                  onChange={e => { setMatSearch(e.target.value); setMatOpen(true); }}
                  onFocus={() => setMatOpen(true)}
                  onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                  placeholder={allServices.length === 0 ? "Előbb add fel az árlistát a Szolgáltatások oldalon" : "Keress az árlistán: pl. Szőkítő, festék…"}
                  style={{ ...inputStyle, borderColor: "rgba(251,191,36,0.2)" }}
                />
                {matSearch && <button type="button" onClick={() => { setMatSearch(""); setMatOpen(false); }} style={{ position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>}

                {matOpen && filteredMat.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "12px", marginTop: "0.25rem", maxHeight: 200, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.65)" }}>
                    {filteredMat.map((m, i) => {
                      const already = !!selectedMats.find(s => s.id === m.id);
                      const showCat = i === 0 || filteredMat[i - 1]?.categoryName !== m.categoryName;
                      return (
                        <div key={m.id}>
                          {showCat && (
                            <div style={{ padding: "0.4rem 0.9rem 0.15rem", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(251,191,36,0.4)", textTransform: "uppercase" }}>
                              {m.categoryName}
                            </div>
                          )}
                          <div onMouseDown={() => { if (!already) addMat(m); }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.9rem", cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1, transition: "background 0.15s" }}
                            onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            {already && <span style={{ fontSize: "0.7rem", color: "#fbbf24" }}>✓</span>}
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: "#fbbf24", fontWeight: 700 }}>{fmt(m.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Non-material: description + amount ── */}
          {type !== "material" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", position: "relative" }}>
                <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(74,124,126,0.6)" }}>Leírás</label>
                <div style={{ position: "relative" }}>
                  <input value={description} onChange={e => { setDesc(e.target.value); setSvcOpen(true); }}
                    onFocus={e => { setSvcOpen(true); e.target.style.borderColor = cfg.color; e.target.style.boxShadow = `0 0 0 3px ${cfg.color}18`; }}
                    onBlur={e => { setTimeout(() => setSvcOpen(false), 150); e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    placeholder={type === "revenue" ? "pl. Balayage, Hajvágás…" : "pl. Bér – október"}
                    required style={inputStyle} />
                  {description && <button type="button" onClick={() => { setDesc(""); setSvcOpen(false); }} style={{ position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>}
                </div>
                {svcOpen && filteredSvc.length > 0 && type === "revenue" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--bg-modal)", border: `1px solid ${cfg.color}44`, borderRadius: "12px", marginTop: "0.25rem", maxHeight: 200, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                    {filteredSvc.map((svc, i) => {
                      const showCat = i === 0 || filteredSvc[i - 1]?.categoryName !== svc.categoryName;
                      return (
                        <div key={svc.id}>
                          {showCat && <div style={{ padding: "0.45rem 0.9rem 0.2rem", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: `${cfg.color}66`, textTransform: "uppercase" }}>{svc.categoryName}</div>}
                          <div onMouseDown={() => { setDesc(svc.name); if (!amountManual) setAmount(String(svc.price)); setSvcOpen(false); }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.9rem", cursor: "pointer", transition: "background 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${cfg.color}12`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", flex: 1 }}>{svc.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: cfg.color, fontWeight: 700 }}>{fmt(svc.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(74,124,126,0.6)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  Összeg (Ft)
                  {!amountManual && amount && <span style={{ color: "rgba(110,231,183,0.7)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>AUTO</span>}
                </label>
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setAmountManual(true); }} placeholder="0" required min="1" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = cfg.color; e.target.style.boxShadow = `0 0 0 3px ${cfg.color}18`; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
              </div>
            </>
          )}

          {/* Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(74,124,126,0.6)" }}>
              Dátum
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={{ ...inputStyle, colorScheme: "light" }}
              onFocus={e => { e.target.style.borderColor = cfg.color; e.target.style.boxShadow = `0 0 0 3px ${cfg.color}18`; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "0.8rem", borderRadius: "10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", letterSpacing: "0.15em", cursor: "pointer" }}
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={create.isPending || (type === "material" && selectedMats.length === 0)}
              style={{
                flex: 2,
                padding: "0.8rem",
                borderRadius: "10px",
                border: "none",
                background: `linear-gradient(120deg, ${cfg.color}88 0%, ${cfg.color} 50%, ${cfg.color}88 100%)`,
                backgroundSize: "200% auto",
                color: "#fff",
                fontFamily: "var(--font-cinzel)",
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.18em",
                cursor: create.isPending ? "not-allowed" : "pointer",
                animation: "shimmer 3s linear infinite",
                opacity: create.isPending ? 0.7 : 1,
              }}
            >
              {create.isPending ? "Mentés..." : "Mentés ✦"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "0.75rem 1rem",
  color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.3s, box-shadow 0.3s",
  width: "100%",
};

export default function FinancesClient({ isAdmin = true }: { isAdmin?: boolean }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);

  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month });
  const utils = api.useUtils();
  const del = api.finance.delete.useMutation({ onSuccess: () => utils.finance.list.invalidate() });

  const revenue  = entries.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = entries.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage     = entries.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - material - wage;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div style={{ animation: "fadeInUp 0.5s ease" }}>
      {showAdd && <AddModal onClose={() => setShowAdd(false)} year={year} month={month} />}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", textShadow: "0 0 24px rgba(122,124,58,0.2)", animation: "float 4s ease-in-out infinite" }}>
            Pénzügyek ✦
          </h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem" }}>
            {isAdmin ? "Bevételek, kiadások és nyereség áttekintése" : "Saját bevételeid és anyagköltségeid"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(120deg, var(--color-teal) 0%, var(--color-teal-light) 50%, var(--color-teal) 100%)",
            backgroundSize: "200% auto",
            color: "#fff",
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.18em",
            cursor: "pointer",
            animation: "shimmer 3s linear infinite",
            boxShadow: "0 4px 20px rgba(122,124,58,0.2)",
            flexShrink: 0,
          }}
        >
          + Új tétel
        </button>
      </div>

      {/* Month navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--color-teal)", minWidth: 160, textAlign: "center" }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
        <SummaryCard label="Bevétel"      value={revenue}  color="#6ee7b7" icon="◈" />
        <SummaryCard label="Anyagköltség" value={material} color="#fbbf24" icon="✦" />
        {isAdmin && <SummaryCard label="Bérek" value={wage} color="#a78bfa" icon="♦" />}
        {isAdmin && (
          <SummaryCard
            label="Nyereség"
            value={profit}
            color={profit >= 0 ? "#6ee7b7" : "#f87171"}
            icon="✧"
            sub={revenue > 0 ? `Árrés: ${Math.round((profit / revenue) * 100)}%` : undefined}
          />
        )}
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontStyle: "italic", fontFamily: "var(--font-cormorant)", padding: "3rem" }}>
          Betöltés...
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--bg-panel)",
            border: "1px dashed var(--border)",
            borderRadius: "16px",
            color: "rgba(44,36,32,0.35)",
            fontStyle: "italic",
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.1rem",
          }}
        >
          Ebben a hónapban még nincsenek tételek. ✦
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {(["revenue", "material", "wage"] as EntryType[]).map(type => {
            const group = entries.filter(e => e.type === type);
            if (!group.length) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type}>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `${cfg.color}bb`, marginBottom: "0.5rem", marginTop: "0.5rem" }}>
                  {cfg.icon} {cfg.label}
                </div>
                {group.map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.9rem 1.25rem",
                      background: "var(--bg-panel)",
                      border: `1px solid ${cfg.color}22`,
                      borderRadius: "12px",
                      marginBottom: "0.4rem",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${cfg.dim}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-panel)"; }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)" }}>
                        {entry.description}
                      </div>
                      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "var(--text-soft)", fontStyle: "italic" }}>
                        {new Date(entry.date).toLocaleDateString("hu-HU")}
                        {entry.createdBy?.name && ` · ${entry.createdBy.name}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {fmt(entry.amount)}
                    </div>
                    <button
                      onClick={() => del.mutate({ id: entry.id })}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        fontSize: "1rem",
                        padding: "0.25rem 0.4rem",
                        borderRadius: "6px",
                        transition: "color 0.2s, background 0.2s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--color-teal)",
  fontSize: "1.2rem",
  width: 36, height: 36,
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.2s",
};
