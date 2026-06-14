"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

const gold  = "var(--color-teal)";
const cream = "var(--text-primary)";
const dim   = "var(--text-soft)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9,
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: cream, fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

// ── types ─────────────────────────────────────────────────────────────────────
type MatRow = { name: string; brand: string; colorCode: string; grams: string; unitPrice: number; lineTotal: number };
type SvcRow = { id: string; name: string; price: number; duration: number; categoryName: string; gender?: string };

type GuestCardData = {
  id: string; date: string | Date; total: number; notes: string | null;
  worker: { id: string; name: string | null };
  services:  { id: string; name: string; price: number; duration?: number; gender?: string | null; categoryName?: string | null }[];
  materials: { id: string; name: string; brand: string | null; colorCode: string | null; grams: number; unitPrice: number; lineTotal: number }[];
};

type GuestWithCards = {
  id: string; name: string; phone: string | null; notes: string | null;
  cards: GuestCardData[];
};

const MAT_OPTIONS = [
  { name: "Tartós festék",      unitPrice: 90,   unit: "g" },
  { name: "Féltartós színező",  unitPrice: 90,   unit: "g" },
  { name: "Fizikai színező",    unitPrice: 90,   unit: "g" },
  { name: "Toner",              unitPrice: 110,  unit: "g" },
  { name: "Szőkítő",            unitPrice: 80,   unit: "g" },
  { name: "Pigment eltávolító", unitPrice: 5000, unit: "csomag" },
];

// ── Single visit card ─────────────────────────────────────────────────────────
function VisitCard({ card, onDelete, onEdit }: { card: GuestCardData; onDelete: () => void; onEdit: () => void }) {
  const [open, setOpen] = useState(false);

  const dateLabel = new Date(card.date).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--bg-active)", borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--bg-active)"; }}>

      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: dim, minWidth: 110 }}>{dateLabel}</div>
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "rgba(167,139,250,0.7)", flex: 1 }}>
          {card.worker.name}
          {card.services.length > 0 && <span style={{ color: dim }}> · {card.services.map(s => s.name).join(", ")}</span>}
        </div>
        {card.materials.length > 0 && (
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "0.15rem 0.5rem", border: "1px solid var(--border)", borderRadius: 4 }}>
            ✦ RECEPT
          </span>
        )}
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: gold, fontWeight: 700, minWidth: 70, textAlign: "right" }}>{fmt(card.total)}</div>
        <span style={{ color: dim, fontSize: "0.75rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--bg-highlight)", padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {card.services.length > 0 && (
            <div>
              <div style={{ ...labelStyle, color: "var(--text-muted)", marginBottom: "0.4rem" }}>◈ Elvégzett szolgáltatások</div>
              {card.services.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--bg-panel)" }}>
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: cream }}>{s.name}{s.gender && <span style={{ fontSize: "0.75rem", color: dim, marginLeft: "0.4rem" }}>({s.gender})</span>}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price)}</span>
                </div>
              ))}
            </div>
          )}

          {card.materials.length > 0 && (
            <div>
              <div style={{ ...labelStyle, color: "var(--text-muted)", marginBottom: "0.4rem" }}>✦ Szín recept</div>
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 0.9fr 0.7fr 0.9fr", gap: "0.25rem 0.6rem", alignItems: "center" }}>
                {["Anyag","Márka","Kód","Gramm","Ár"].map(h => (
                  <div key={h} style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.12em", color: "var(--border)", textTransform: "uppercase", paddingBottom: "0.2rem", borderBottom: "1px solid var(--bg-highlight)" }}>{h}</div>
                ))}
                {card.materials.map(m => (
                  <>
                    <span key={`${m.id}n`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: cream }}>{m.name}</span>
                    <span key={`${m.id}b`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: dim }}>{m.brand ?? "—"}</span>
                    <span key={`${m.id}c`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "rgba(232,180,200,0.8)", letterSpacing: "0.05em" }}>{m.colorCode ?? "—"}</span>
                    <span key={`${m.id}g`} style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: dim }}>{m.grams}g</span>
                    <span key={`${m.id}p`} style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(m.lineTotal)}</span>
                  </>
                ))}
              </div>
            </div>
          )}

          {card.notes && (
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: dim, fontStyle: "italic", padding: "0.4rem 0.7rem", background: "var(--bg-panel)", borderRadius: 7, borderLeft: "2px solid var(--border)" }}>
              {card.notes}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid var(--bg-highlight)" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onDelete} style={{ background: "none", border: "none", color: "rgba(248,113,113,0.35)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.35)"; }}>
                Törlés
              </button>
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                style={{ background: "none", border: "none", color: "rgba(122,158,140,0.5)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-teal)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(122,158,140,0.5)"; }}>
                Szerkesztés
              </button>
            </div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", color: dim }}>
              VÉGÖSSZEG <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: gold, fontWeight: 700, marginLeft: "0.4rem" }}>{fmt(card.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit card modal ────────────────────────────────────────────────────────────
function EditCardModal({ card, onClose }: { card: GuestCardData; onClose: () => void }) {
  const utils = api.useUtils();
  const { data: workers = [] }    = api.calendar.users.useQuery();
  const { data: categories = [] } = api.services.listCategories.useQuery();

  const updateCard = api.guests.updateCard.useMutation({
    onSuccess: () => { void utils.guests.guestBook.invalidate(); void utils.finance.list.invalidate(); void utils.calendar.month.invalidate(); onClose(); },
  });
  const deleteCard = api.guests.deleteCard.useMutation({
    onSuccess: () => { void utils.guests.guestBook.invalidate(); void utils.calendar.month.invalidate(); onClose(); },
  });

  const [date,     setDate]     = useState(() => new Date(card.date).toISOString().slice(0, 10));
  const [workerId, setWorkerId] = useState(card.worker.id);
  const [notes,    setNotes]    = useState(card.notes ?? "");

  const gColors: Record<string, { border: string; bg: string; text: string }> = {
    nő:      { border: "rgba(232,180,200,0.7)", bg: "rgba(232,180,200,0.15)", text: "#e8b4c8" },
    férfi:   { border: "rgba(122,158,200,0.7)", bg: "rgba(122,158,200,0.12)", text: "#7a9ec8" },
    gyermek: { border: "rgba(167,139,250,0.7)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
  };

  const [selSvcs, setSelSvcs] = useState<SvcRow[]>(() =>
    card.services.map(s => ({ id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: s.categoryName ?? "", gender: s.gender ?? undefined }))
  );
  const [svcSearch, setSvcSearch] = useState("");
  const [svcOpen,   setSvcOpen]   = useState(false);

  const [matRows, setMatRows] = useState<MatRow[]>(() =>
    card.materials.length > 0
      ? card.materials.map(m => ({ name: m.name, brand: m.brand ?? "", colorCode: m.colorCode ?? "", grams: String(m.grams), unitPrice: m.unitPrice, lineTotal: m.lineTotal }))
      : [{ name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }]
  );
  const [matSearch, setMatSearch] = useState("");
  const [matOpen,   setMatOpen]   = useState(false);
  const [activeMat, setActiveMat] = useState(0);

  const allSvcs: SvcRow[] = [];
  categories.forEach(c => c.services.forEach((s: { id: string; name: string; price: number; duration: number }) =>
    allSvcs.push({ id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: c.name })
  ));
  const filtSvcs = svcSearch.trim() ? allSvcs.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase())) : allSvcs;
  const filtMat  = matSearch.trim() ? MAT_OPTIONS.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase())) : MAT_OPTIONS;

  function updateMat(i: number, field: keyof MatRow, val: string | number) {
    setMatRows(prev => {
      const rows = [...prev]; const row = { ...rows[i]! };
      (row as Record<string, string | number>)[field] = val;
      if (field === "grams" || field === "unitPrice") {
        const g = parseFloat(field === "grams" ? String(val) : row.grams);
        const p = field === "unitPrice" ? Number(val) : row.unitPrice;
        row.lineTotal = isNaN(g) ? 0 : g * p;
      }
      rows[i] = row; return rows;
    });
  }

  const svcTotal = selSvcs.reduce((s, x) => s + x.price, 0);
  const matTotal = matRows.reduce((s, r) => s + r.lineTotal, 0);

  function handleSave() {
    const mats = matRows.filter(r => r.name.trim() && parseFloat(r.grams) > 0)
      .map(r => ({ name: r.name, brand: r.brand || undefined, colorCode: r.colorCode || undefined, grams: parseFloat(r.grams), unitPrice: r.unitPrice, lineTotal: r.lineTotal }));
    updateCard.mutate({
      id: card.id, date, workerId, notes: notes || undefined,
      services:  selSvcs.map(s => ({ name: s.name, price: s.price, duration: s.duration, gender: s.gender, categoryName: s.categoryName })),
      materials: mats,
    });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem" }}>
        <div style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem 2.25rem", width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1rem", letterSpacing: "0.14em", color: gold, margin: 0 }}>✎ Kártya szerkesztése</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: dim, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Worker + date */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ki végezte?</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {workers.map(u => {
                    const sel = workerId === u.id;
                    return (
                      <button key={u.id} type="button" onClick={() => setWorkerId(u.id)}
                        style={{ padding: "0.4rem 0.8rem", borderRadius: 7, cursor: "pointer", border: sel ? "1px solid var(--color-teal)" : "1px solid var(--bg-active)", background: sel ? "rgba(74,124,126,0.15)" : "transparent", color: sel ? "var(--color-teal)" : dim, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", transition: "all 0.2s" }}>
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Dátum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "light" }} />
              </div>
            </div>

            {/* Services */}
            <div>
              <label style={labelStyle}>Elvégzett szolgáltatások</label>
              {selSvcs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.5rem" }}>
                  {selSvcs.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.65rem", background: "var(--bg-active)", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--color-teal)", flex: 1 }}>{s.name}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "var(--color-teal)", opacity: 0.7, fontWeight: 700 }}>{fmt(s.price)}</span>
                      {(["nő", "férfi", "gyermek"] as const).map(g => {
                        const c = gColors[g]!; const active = s.gender === g;
                        return (
                          <button key={g} type="button"
                            onClick={() => setSelSvcs(p => p.map((x, j) => j === i ? { ...x, gender: active ? undefined : g } : x))}
                            style={{ padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${active ? c.border : "var(--border)"}`, background: active ? c.bg : "transparent", color: active ? c.text : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.09em", cursor: "pointer" }}>
                            {g === "nő" ? "Női" : g === "férfi" ? "Férfi" : "Gyermek"}
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setSelSvcs(p => p.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input value={svcSearch} onChange={e => { setSvcSearch(e.target.value); setSvcOpen(true); }}
                  onFocus={() => setSvcOpen(true)} onBlur={() => setTimeout(() => setSvcOpen(false), 150)}
                  placeholder="Keress szolgáltatást…" style={inputStyle} />
                {svcOpen && filtSvcs.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", maxHeight: 160, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                    {filtSvcs.map((s, i) => {
                      const already = !!selSvcs.find(x => x.name === s.name);
                      const showCat = i === 0 || filtSvcs[i-1]?.categoryName !== s.categoryName;
                      return (
                        <div key={s.id}>
                          {showCat && <div style={{ padding: "0.35rem 0.9rem 0.1rem", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.14em", color: "var(--text-dim)", textTransform: "uppercase" }}>{s.categoryName}</div>}
                          <div onMouseDown={() => { if (!already) { setSelSvcs(p => [...p, { ...s, duration: s.duration ?? 0 }]); setSvcSearch(""); setSvcOpen(false); } }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.9rem", cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1 }}
                            onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: cream, flex: 1 }}>{s.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Materials */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>✦ Szín recept</label>
                <button type="button" onClick={() => setMatRows(p => [...p, { name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }])}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--color-teal)", cursor: "pointer", fontSize: "0.7rem", padding: "0.2rem 0.6rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
                  ＋ Sor
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matRows.map((row, i) => (
                  <div key={i} style={{ background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ flex: 2, position: "relative" }}>
                        <input value={row.name}
                          onChange={e => { updateMat(i, "name", e.target.value); setActiveMat(i); setMatSearch(e.target.value); setMatOpen(true); }}
                          onFocus={() => { setActiveMat(i); setMatSearch(row.name); setMatOpen(true); }}
                          onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                          placeholder="Anyag neve…" style={{ ...inputStyle, fontSize: "0.92rem" }} />
                        {matOpen && activeMat === i && filtMat.length > 0 && (
                          <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                            {filtMat.map(m => (
                              <div key={m.name}
                                onMouseDown={() => { updateMat(i, "name", m.name); updateMat(i, "unitPrice", m.unitPrice); setMatSearch(""); setMatOpen(false); }}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.48rem 0.85rem", cursor: "pointer" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: cream, flex: 1 }}>{m.name}</span>
                                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "var(--color-teal)", fontWeight: 700 }}>{m.unitPrice} Ft/{m.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input value={row.brand} onChange={e => updateMat(i, "brand", e.target.value)} placeholder="Márka" style={{ ...inputStyle, flex: 1.2, fontSize: "0.92rem" }} />
                      <input value={row.colorCode} onChange={e => updateMat(i, "colorCode", e.target.value)} placeholder="Színkód" style={{ ...inputStyle, flex: 1, fontSize: "0.92rem" }} />
                      <button type="button" onClick={() => setMatRows(p => p.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0 0.2rem", alignSelf: "center" }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input type="number" value={row.grams} onChange={e => updateMat(i, "grams", e.target.value)} placeholder="Gramm" min="0" step="any"
                        style={{ ...inputStyle, flex: 1, fontSize: "0.9rem", textAlign: "center" }} />
                      <span style={{ fontFamily: "var(--font-cormorant)", color: dim, fontSize: "0.9rem" }}>g ×</span>
                      <span style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-muted)", fontSize: "0.9rem", minWidth: 55 }}>{fmt(row.unitPrice)}</span>
                      <span style={{ color: dim, fontSize: "0.85rem" }}>=</span>
                      <span style={{ fontFamily: "var(--font-playfair)", color: "var(--color-teal)", fontWeight: 700, fontSize: "0.95rem", marginLeft: "auto" }}>{fmt(row.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. következő időpont…" style={inputStyle} />
            </div>

            {/* Total + save */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: dim }}>
                {svcTotal > 0 && <span>Szolgáltatás: {fmt(svcTotal)}</span>}
                {svcTotal > 0 && matTotal > 0 && <span style={{ margin: "0 0.4rem" }}>·</span>}
                {matTotal > 0 && <span>Anyag: {fmt(matTotal)}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em", color: dim }}>
                VÉGÖSSZEG <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", color: gold, fontWeight: 700, marginLeft: "0.5rem" }}>{fmt(svcTotal + matTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button"
                onClick={() => { if (confirm("Törlöd ezt a kártyát?")) deleteCard.mutate({ id: card.id }); }}
                disabled={deleteCard.isPending}
                style={{ padding: "0.8rem 1.1rem", borderRadius: 10, background: "transparent", border: "1px solid rgba(248,113,113,0.3)", color: "rgba(248,113,113,0.6)", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f87171"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.3)"; (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.6)"; }}>
                {deleteCard.isPending ? "Törlés…" : "✕ Törlés"}
              </button>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.8rem", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: dim, fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer" }}>Mégse</button>
              <button type="button" onClick={handleSave} disabled={updateCard.isPending} className="btn-gold" style={{ flex: 2, padding: "0.8rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em" }}>
                {updateCard.isPending ? "Mentés…" : "Mentés ✦"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Guest row in receptkönyv ───────────────────────────────────────────────────
function GuestRow({ guest, onDeleteCard, onNewCard }: {
  guest: GuestWithCards;
  onDeleteCard: (id: string) => void;
  onNewCard: (guestId: string, guestName: string) => void;
}) {
  const utils = api.useUtils();
  const [open,        setOpen]        = useState(false);
  const [editingCard, setEditingCard] = useState<GuestCardData | null>(null);
  const [editGuest,   setEditGuest]   = useState(false);
  const [editName,    setEditName]    = useState(guest.name);
  const [editPhone,   setEditPhone]   = useState(guest.phone ?? "");
  const [editNotes,   setEditNotes]   = useState(guest.notes ?? "");

  const updateGuest = api.guests.updateGuest.useMutation({
    onSuccess: () => { void utils.guests.guestBook.invalidate(); setEditGuest(false); },
  });
  const deleteGuest = api.guests.deleteGuest.useMutation({
    onSuccess: () => void utils.guests.guestBook.invalidate(),
  });

  const totalSpent = guest.cards.reduce((s, c) => s + c.total, 0);
  const lastVisit  = guest.cards[0] ? new Date(guest.cards[0].date).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <>
    {editingCard && <EditCardModal card={editingCard} onClose={() => setEditingCard(null)} />}
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px var(--bg-highlight)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>

      <div style={{ padding: "1.1rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--bg-active), var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "1rem", color: cream, flexShrink: 0, border: "1px solid var(--border)" }}>
          {(guest.name[0] ?? "?").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: cream }}>{guest.name}</div>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dim, display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <span>{guest.cards.length} látogatás</span>
            {guest.phone && <span>📞 {guest.phone}</span>}
            {lastVisit  && <span>Utolsó: {lastVisit}</span>}
          </div>
        </div>
        {totalSpent > 0 && (
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: gold, fontWeight: 700, flexShrink: 0 }}>{fmt(totalSpent)}</div>
        )}
        <button type="button" onClick={e => { e.stopPropagation(); setEditGuest(v => !v); setOpen(true); }}
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: editGuest ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.08em", padding: "0.28rem 0.55rem", flexShrink: 0, transition: "all 0.2s" }}>
          ✎
        </button>
        <button type="button"
          onClick={e => { e.stopPropagation(); onNewCard(guest.id, guest.name); }}
          style={{ background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: 7, color: gold, cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.1em", padding: "0.3rem 0.65rem", flexShrink: 0, transition: "all 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}>
          ＋ Kártya
        </button>
        <span style={{ color: dim, fontSize: "0.85rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--bg-highlight)", padding: "0.85rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>

          {/* Guest edit form */}
          {editGuest && (
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Vendég adatai</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input value={editName}  onChange={e => setEditName(e.target.value)}  placeholder="Név"      style={{ ...inputStyle, flex: 2, minWidth: 120 }} />
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Telefon"  style={{ ...inputStyle, flex: 1, minWidth: 100 }} />
              </div>
              <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Megjegyzés (pl. allergia, preferenciák…)" style={inputStyle} />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => { if (confirm("Biztosan törlöd ezt a vendéget és az összes kártyáját?")) deleteGuest.mutate({ id: guest.id }); }}
                  style={{ background: "none", border: "none", color: "rgba(248,113,113,0.4)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>
                  Vendég törlése
                </button>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => setEditGuest(false)} style={{ padding: "0.35rem 0.85rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: dim, cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>Mégsem</button>
                  <button onClick={() => updateGuest.mutate({ id: guest.id, name: editName.trim() || guest.name, phone: editPhone || undefined, notes: editNotes || undefined })}
                    disabled={updateGuest.isPending}
                    style={{ padding: "0.35rem 1rem", borderRadius: 7, border: "1px solid var(--color-teal)", background: "var(--color-teal)", color: "var(--bg-base)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", fontWeight: 700 }}>
                    {updateGuest.isPending ? "…" : "Mentés"}
                  </button>
                </div>
              </div>
              {guest.notes && !editNotes && (
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: dim, fontStyle: "italic", padding: "0.3rem 0.5rem", borderLeft: "2px solid var(--border)" }}>{guest.notes}</div>
              )}
            </div>
          )}

          {guest.cards.length === 0 ? (
            <div style={{ fontFamily: "var(--font-cormorant)", color: dim, textAlign: "center", padding: "1rem", fontStyle: "italic" }}>Még nincs mentett kártya</div>
          ) : (
            guest.cards.map(card => (
              <VisitCard key={card.id} card={card}
                onDelete={() => { if (confirm("Törlöd ezt a kártyát?")) onDeleteCard(card.id); }}
                onEdit={() => setEditingCard(card)} />
            ))
          )}
        </div>
      )}
    </div>
    </>
  );
}

// ── New card modal ────────────────────────────────────────────────────────────
function NewCardModal({ prefillGuestId, prefillGuestName, onClose }: {
  prefillGuestId?: string;
  prefillGuestName?: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  const { data: allGuests = [] }  = api.guests.listGuests.useQuery();
  const { data: workers = [] }    = api.calendar.users.useQuery();
  const { data: categories = [] } = api.services.listCategories.useQuery();

  const createGuest   = api.guests.createGuest.useMutation({ onSuccess: () => void utils.guests.listGuests.invalidate() });
  const createCard    = api.guests.createCard.useMutation({ onSuccess: () => void utils.guests.guestBook.invalidate() });
  const createFinance = api.finance.create.useMutation({ onSuccess: () => void utils.finance.list.invalidate() });

  const [guestSearch, setGuestSearch] = useState(prefillGuestName ?? "");
  const [guestId,     setGuestId]     = useState(prefillGuestId ?? "");
  const [guestName,   setGuestName]   = useState("");
  const [guestOpen,   setGuestOpen]   = useState(false);
  const [newGuest,    setNewGuest]    = useState(false);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [date,     setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [notes,    setNotes]    = useState("");

  const [svcSearch, setSvcSearch] = useState("");
  const [svcOpen,   setSvcOpen]   = useState(false);
  const [selSvcs,   setSelSvcs]   = useState<SvcRow[]>([]);

  const allSvcs: { id: string; name: string; price: number; duration: number; categoryName: string }[] = [];
  categories.forEach(c => c.services.forEach((s: { id: string; name: string; price: number; duration: number }) =>
    allSvcs.push({ ...s, duration: s.duration ?? 0, categoryName: c.name })
  ));
  const filtSvcs = svcSearch.trim()
    ? allSvcs.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
    : allSvcs;

  const [matRows,   setMatRows]   = useState<MatRow[]>([{ name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }]);
  const [matSearch, setMatSearch] = useState("");
  const [matOpen,   setMatOpen]   = useState(false);
  const [activeMat, setActiveMat] = useState(0);

  const filtMat = matSearch.trim()
    ? MAT_OPTIONS.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()))
    : MAT_OPTIONS;

  const filtGuests = guestSearch.trim()
    ? allGuests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase()))
    : allGuests;

  const svcTotal   = selSvcs.reduce((s, x) => s + x.price, 0);
  const matTotal   = matRows.reduce((s, r) => s + r.lineTotal, 0);
  const grandTotal = svcTotal + matTotal;

  function updateMat(i: number, field: keyof MatRow, val: string | number) {
    setMatRows(prev => {
      const rows = [...prev];
      const row = { ...rows[i]! };
      (row as Record<string, string | number>)[field] = val;
      if (field === "grams" || field === "unitPrice") {
        const g = parseFloat(field === "grams" ? String(val) : row.grams);
        const p = field === "unitPrice" ? Number(val) : row.unitPrice;
        row.lineTotal = isNaN(g) ? 0 : g * p;
      }
      rows[i] = row;
      return rows;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let finalGuestId = guestId;
    if (newGuest && guestName.trim()) {
      const g = await createGuest.mutateAsync({ name: guestName.trim() });
      finalGuestId = g.id;
    }
    if (!finalGuestId) return;
    const finalWorkerId = workerId || (workers[0]?.id ?? "");
    const mats = matRows
      .filter(r => r.name.trim() && parseFloat(r.grams) > 0)
      .map(r => ({
        name: r.name, brand: r.brand || undefined, colorCode: r.colorCode || undefined,
        grams: parseFloat(r.grams), unitPrice: r.unitPrice, lineTotal: r.lineTotal,
      }));
    const card = await createCard.mutateAsync({
      guestId: finalGuestId,
      workerId: finalWorkerId,
      date, notes: notes || undefined,
      services: selSvcs,
      materials: mats,
    });

    // Revenue entry linked to the card
    const gLabel = (g?: string) => g === "nő" ? "Női" : g === "férfi" ? "Férfi" : g === "gyermek" ? "Gyermek" : "";
    if (selSvcs.length > 0) {
      const svcTotal = selSvcs.reduce((s, x) => s + x.price, 0);
      const desc = selSvcs.map(s => [gLabel(s.gender), s.name, s.categoryName].filter(Boolean).join(" ")).join(", ");
      await createFinance.mutateAsync({
        type: "revenue", description: desc, amount: svcTotal, date,
        guestCardId: card.id, workerUserId: finalWorkerId,
      });
    }
    // Material entry linked to same card
    if (mats.length > 0) {
      const matTot = mats.reduce((s, r) => s + r.lineTotal, 0);
      const matDesc = mats.map(r => `${r.name} (${r.grams}g)`).join(", ");
      await createFinance.mutateAsync({
        type: "material", description: matDesc, amount: matTot, date,
        guestCardId: card.id, workerUserId: finalWorkerId,
      });
    }
    onClose();
  }

  const workerColors = ["var(--color-teal)","var(--color-teal)","var(--color-teal)"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem" }}>
        <div style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem 2.25rem", width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1rem", letterSpacing: "0.14em", color: gold, margin: 0 }}>♦ Kártya mentése a receptkönyvbe</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: dim, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Guest */}
            <div>
              <label style={labelStyle}>Vendég neve</label>
              {!newGuest ? (
                <div style={{ position: "relative" }}>
                  <input value={guestSearch}
                    onChange={e => { setGuestSearch(e.target.value); setGuestOpen(true); setGuestId(""); }}
                    onFocus={() => setGuestOpen(true)}
                    onBlur={() => setTimeout(() => setGuestOpen(false), 150)}
                    placeholder="Keress vendéget…"
                    readOnly={!!prefillGuestId}
                    style={{ ...inputStyle, borderColor: guestId ? "var(--border)" : "var(--border)", opacity: prefillGuestId ? 0.75 : 1 }} />
                  {guestId && <div style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: gold, fontSize: "0.8rem" }}>✓</div>}
                  {guestOpen && !prefillGuestId && (
                    <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", maxHeight: 180, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                      {filtGuests.map(g => (
                        <div key={g.id} onMouseDown={() => { setGuestId(g.id); setGuestSearch(g.name); setGuestOpen(false); }}
                          style={{ padding: "0.55rem 0.9rem", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: cream, transition: "background 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          {g.name}{g.phone && <span style={{ color: dim, fontSize: "0.8rem", marginLeft: "0.5rem" }}>{g.phone}</span>}
                        </div>
                      ))}
                      <div onMouseDown={() => setNewGuest(true)}
                        style={{ padding: "0.55rem 0.9rem", cursor: "pointer", borderTop: "1px solid var(--bg-highlight)", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", color: gold, transition: "background 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        ＋ Új vendég hozzáadása
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Vendég teljes neve" autoFocus style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={() => setNewGuest(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, color: dim, cursor: "pointer", padding: "0 0.75rem", fontSize: "0.8rem" }}>✕</button>
                </div>
              )}
            </div>

            {/* Worker + date */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ki végezte?</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {workers.map((u, i) => {
                    const col = workerColors[i % workerColors.length]!;
                    const sel = workerId === u.id;
                    return (
                      <button key={u.id} type="button" onClick={() => setWorkerId(u.id)}
                        style={{ padding: "0.4rem 0.8rem", borderRadius: 7, cursor: "pointer", border: sel ? `1px solid ${col}88` : "1px solid var(--bg-active)", background: sel ? `${col}18` : "transparent", color: sel ? col : dim, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", transition: "all 0.2s" }}>
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Dátum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ ...inputStyle, colorScheme: "light" }} />
              </div>
            </div>

            {/* Services */}
            <div>
              <label style={labelStyle}>Elvégzett szolgáltatások</label>
              {selSvcs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  {selSvcs.map((s, i) => {
                    const gColors: Record<string, { border: string; bg: string; text: string }> = {
                      nő:      { border: "rgba(232,180,200,0.7)", bg: "rgba(232,180,200,0.15)", text: "#e8b4c8" },
                      férfi:   { border: "rgba(122,158,200,0.7)", bg: "rgba(122,158,200,0.12)", text: "#7a9ec8" },
                      gyermek: { border: "rgba(167,139,250,0.7)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
                    };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.65rem", background: "var(--bg-active)", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--color-teal)", flex: 1 }}>{s.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "var(--color-teal)", opacity: 0.7, fontWeight: 700 }}>{fmt(s.price)}</span>
                        {(["nő", "férfi", "gyermek"] as const).map(g => {
                          const c = gColors[g]!;
                          const active = s.gender === g;
                          return (
                            <button key={g} type="button"
                              onClick={() => setSelSvcs(p => p.map((x, j) => j === i ? { ...x, gender: active ? undefined : g } : x))}
                              style={{ padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${active ? c.border : "var(--border)"}`, background: active ? c.bg : "transparent", color: active ? c.text : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.09em", cursor: "pointer", transition: "all 0.15s" }}>
                              {g === "nő" ? "Női" : g === "férfi" ? "Férfi" : "Gyermek"}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => setSelSvcs(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input value={svcSearch} onChange={e => { setSvcSearch(e.target.value); setSvcOpen(true); }}
                  onFocus={() => setSvcOpen(true)} onBlur={() => setTimeout(() => setSvcOpen(false), 150)}
                  placeholder="Keress szolgáltatást…" style={inputStyle} />
                {svcOpen && filtSvcs.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", maxHeight: 180, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                    {filtSvcs.map((s, i) => {
                      const already = !!selSvcs.find(x => x.name === s.name);
                      const showCat = i === 0 || filtSvcs[i-1]?.categoryName !== s.categoryName;
                      return (
                        <div key={s.id}>
                          {showCat && <div style={{ padding: "0.4rem 0.9rem 0.15rem", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.14em", color: "var(--text-dim)", textTransform: "uppercase" }}>{s.categoryName}</div>}
                          <div onMouseDown={() => { if (!already) { setSelSvcs(p => [...p, { id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: s.categoryName }]); setSvcSearch(""); setSvcOpen(false); } }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.9rem", cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1, transition: "background 0.15s" }}
                            onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            {already && <span style={{ color: "var(--color-teal)", fontSize: "0.65rem" }}>✓</span>}
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: cream, flex: 1 }}>{s.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Materials / Szín recept */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>✦ Szín recept</label>
                <button type="button" onClick={() => setMatRows(p => [...p, { name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }])}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--color-teal)", cursor: "pointer", fontSize: "0.7rem", padding: "0.2rem 0.6rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
                  ＋ Sor
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matRows.map((row, i) => (
                  <div key={i} style={{ background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ flex: 2, position: "relative" }}>
                        <input value={row.name}
                          onChange={e => { updateMat(i, "name", e.target.value); setActiveMat(i); setMatSearch(e.target.value); setMatOpen(true); }}
                          onFocus={() => { setActiveMat(i); setMatSearch(row.name); setMatOpen(true); }}
                          onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                          placeholder="Anyag neve…"
                          style={{ ...inputStyle, fontSize: "0.92rem", borderColor: "var(--border)" }} />
                        {matOpen && activeMat === i && filtMat.length > 0 && (
                          <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                            {filtMat.map(m => (
                              <div key={m.name}
                                onMouseDown={() => { updateMat(i, "name", m.name); updateMat(i, "unitPrice", m.unitPrice); setMatSearch(""); setMatOpen(false); }}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.48rem 0.85rem", cursor: "pointer", transition: "background 0.12s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: cream, flex: 1 }}>{m.name}</span>
                                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "var(--color-teal)", fontWeight: 700 }}>{m.unitPrice} Ft/{m.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input value={row.brand} onChange={e => updateMat(i, "brand", e.target.value)} placeholder="Márka" style={{ ...inputStyle, flex: 1.2, fontSize: "0.92rem" }} />
                      <input value={row.colorCode} onChange={e => updateMat(i, "colorCode", e.target.value)} placeholder="Színkód" style={{ ...inputStyle, flex: 1, fontSize: "0.92rem" }} />
                      <button type="button" onClick={() => setMatRows(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0 0.2rem", alignSelf: "center" }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input type="number" value={row.grams} onChange={e => updateMat(i, "grams", e.target.value)} placeholder="Gramm" min="0" step="any"
                        style={{ ...inputStyle, flex: 1, fontSize: "0.9rem", textAlign: "center" }} />
                      <span style={{ fontFamily: "var(--font-cormorant)", color: dim, fontSize: "0.9rem" }}>g ×</span>
                      <span style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-muted)", fontSize: "0.9rem", minWidth: 55 }}>{fmt(row.unitPrice)}</span>
                      <span style={{ color: dim, fontSize: "0.85rem" }}>=</span>
                      <span style={{ fontFamily: "var(--font-playfair)", color: "var(--color-teal)", fontWeight: 700, fontSize: "0.95rem", marginLeft: "auto" }}>{fmt(row.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Megjegyzés (opcionális)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. Hajszín változás, következő időpont…" style={inputStyle} />
            </div>

            {/* Grand total + submit */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {svcTotal > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--color-teal)" }}>Szolgáltatás: {fmt(svcTotal)}</span>}
                {matTotal > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--color-teal)" }}>Anyag: {fmt(matTotal)}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em", color: dim }}>
                VÉGÖSSZEG <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", color: gold, fontWeight: 700, marginLeft: "0.5rem" }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.8rem", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: dim, fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer" }}>Mégse</button>
              <button type="submit" disabled={createCard.isPending || (!guestId && !guestName.trim())} className="btn-gold" style={{ flex: 2, padding: "0.8rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em" }}>
                {createCard.isPending ? "Mentés..." : "Mentés a receptkönyvbe ✦"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GuestsClient() {
  const utils = api.useUtils();
  const { data: guests = [], isLoading } = api.guests.guestBook.useQuery();
  const deleteCard = api.guests.deleteCard.useMutation({ onSuccess: () => { void utils.guests.guestBook.invalidate(); void utils.calendar.month.invalidate(); } });

  const [showNew,          setShowNew]          = useState(false);
  const [newCardGuestId,   setNewCardGuestId]   = useState<string | undefined>();
  const [newCardGuestName, setNewCardGuestName] = useState<string | undefined>();
  const [search,           setSearch]           = useState("");

  function openNewCard(guestId?: string, guestName?: string) {
    setNewCardGuestId(guestId);
    setNewCardGuestName(guestName);
    setShowNew(true);
  }

  const filtered = search.trim()
    ? guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : guests;

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 760 }}>
      {showNew && (
        <NewCardModal
          prefillGuestId={newCardGuestId}
          prefillGuestName={newCardGuestName}
          onClose={() => { setShowNew(false); setNewCardGuestId(undefined); setNewCardGuestName(undefined); }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Vendég receptkönyv ♦</h1>
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--color-pink)", opacity: 0.75, fontStyle: "italic", margin: "0.3rem 0 0" }}>Minden vendég szín receptje és látogatási előzménye</p>
        </div>
        <button onClick={() => openNewCard()}
          className="btn-gold" style={{ padding: "0.75rem 1.5rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", flexShrink: 0 }}>
          ＋ Új kártya
        </button>
      </div>

      {guests.length > 0 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keress vendég neve szerint…"
          style={{ ...inputStyle, marginBottom: "1.25rem", maxWidth: 340 }} />
      )}

      {isLoading ? (
        <div style={{ color: dim, fontFamily: "var(--font-cormorant)", textAlign: "center", padding: "3rem" }}>Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>♦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "0.85rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>Még nincs vendég a receptkönyvben</div>
          <div style={{ fontFamily: "var(--font-cormorant)", color: dim }}>Hozd létre az első kártyát az "＋ Új kártya" gombbal.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(guest => (
            <GuestRow key={guest.id} guest={guest as GuestWithCards}
              onDeleteCard={id => deleteCard.mutate({ id })}
              onNewCard={(gId, gName) => openNewCard(gId, gName)} />
          ))}
        </div>
      )}
    </div>
  );
}
