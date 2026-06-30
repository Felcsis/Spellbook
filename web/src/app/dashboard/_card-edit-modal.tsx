"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";

export const fmt = (n: number) =>
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

export type MatRow = { name: string; brand: string; colorCode: string; grams: string; unitPrice: number; lineTotal: number };
export type SvcRow = { id: string; name: string; price: number; duration: number; categoryName: string; gender?: string };

export type GuestCardData = {
  id: string; date: string | Date; total: number; notes: string | null;
  worker: { id: string; name: string | null };
  services:  { id: string; name: string; price: number; duration?: number; gender?: string | null; categoryName?: string | null }[];
  materials: { id: string; name: string; brand: string | null; colorCode: string | null; grams: number; unitPrice: number; lineTotal: number }[];
};

export const MAT_OPTIONS = [
  { name: "Tartós festék",      unitPrice: 90,   unit: "g" },
  { name: "Féltartós színező",  unitPrice: 90,   unit: "g" },
  { name: "Fizikai színező",    unitPrice: 90,   unit: "g" },
  { name: "Toner",              unitPrice: 110,  unit: "g" },
  { name: "Szőkítő",            unitPrice: 80,   unit: "g" },
  { name: "Pigment eltávolító", unitPrice: 5000, unit: "csomag" },
];

const gColors: Record<string, { border: string; bg: string; text: string }> = {
  nő:      { border: "rgba(232,180,200,0.7)", bg: "rgba(232,180,200,0.15)", text: "#e8b4c8" },
  férfi:   { border: "rgba(122,158,200,0.7)", bg: "rgba(122,158,200,0.12)", text: "#7a9ec8" },
  gyermek: { border: "rgba(167,139,250,0.7)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
};

export function EditCardModal({ card, onClose }: { card: GuestCardData; onClose: () => void }) {
  const utils = api.useUtils();
  const { data: workers = [] }    = api.calendar.users.useQuery();
  const { data: categories = [] } = api.services.listCategories.useQuery();

  const updateCard = api.guests.updateCard.useMutation({
    onSuccess: () => {
      void utils.guests.guestBook.invalidate();
      void utils.guests.listCards.invalidate();
      void utils.finance.list.invalidate();
      void utils.calendar.month.invalidate();
      onClose();
    },
  });
  const deleteCard = api.guests.deleteCard.useMutation({
    onSuccess: () => {
      void utils.guests.guestBook.invalidate();
      void utils.guests.listCards.invalidate();
      void utils.finance.list.invalidate();
      void utils.calendar.month.invalidate();
      onClose();
    },
  });

  const [date,     setDate]     = useState(() => new Date(card.date).toISOString().slice(0, 10));
  const [workerId, setWorkerId] = useState(card.worker.id);
  const [notes,    setNotes]    = useState(card.notes ?? "");

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
        <div className="modal-card" style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem 2.25rem", width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}
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

export function CardEditById({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const { data: card, isLoading } = api.guests.getCard.useQuery({ id: cardId });
  if (isLoading) return null;
  if (!card) return null;
  return <EditCardModal card={card} onClose={onClose} />;
}
