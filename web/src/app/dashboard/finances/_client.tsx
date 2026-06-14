"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { EntryList } from "./_entry-list";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

const TYPE_CONFIG = {
  revenue:  { label: "Bevétel",       color: "#527666", dim: "rgba(82,118,102,0.12)",  icon: "◈" },
  material: { label: "Anyagköltség",  color: "#a06830", dim: "rgba(160,104,48,0.12)",  icon: "✦" },
  wage:     { label: "Bér",           color: "#7256a0", dim: "rgba(114,86,160,0.12)",  icon: "♦" },
} as const;

type EntryType = keyof typeof TYPE_CONFIG;

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function weekBounds(d: Date) {
  const dow = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - dow); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return { mon, sun };
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px",
  padding: "0.7rem 1rem", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", width: "100%",
};

const navBtn: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
  color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
};

// ── Visit entry (combined revenue + material + guest card) ────────────────────
const MAT_OPTIONS = [
  { name: "Tartós festék",      unitPrice: 90,   unit: "g" },
  { name: "Féltartós színező",  unitPrice: 90,   unit: "g" },
  { name: "Fizikai színező",    unitPrice: 90,   unit: "g" },
  { name: "Toner",              unitPrice: 110,  unit: "g" },
  { name: "Szőkítő",            unitPrice: 80,   unit: "g" },
  { name: "Pigment eltávolító", unitPrice: 5000, unit: "csomag" },
];

type SelSvc = { id: string; name: string; price: number; duration: number; categoryName: string; gender?: string };
type MatRow = { name: string; brand: string; colorCode: string; grams: string; unitPrice: number; lineTotal: number };

const COLOR_KEYWORDS = ["festés","festek","szőkít","toner","féltartós","tartós festék","melír","balayage","ombre","pigment","highlight","szín"];

function needsMaterial(svcs: SelSvc[]) {
  return svcs.some(s =>
    COLOR_KEYWORDS.some(kw =>
      s.name.toLowerCase().includes(kw) || s.categoryName.toLowerCase().includes(kw)
    )
  );
}

function VisitEntry({ onSaved, userId }: { onSaved: () => void; userId: string }) {
  const utils = api.useUtils();
  const { data: categories = [] }  = api.services.listCategories.useQuery();
  const { data: allGuests = [] }   = api.guests.listGuests.useQuery();
  const createFinance  = api.finance.create.useMutation();
  const createGuest    = api.guests.createGuest.useMutation({ onSuccess: () => void utils.guests.listGuests.invalidate() });
  const createCard     = api.guests.createCard.useMutation({ onSuccess: () => void utils.guests.guestBook.invalidate() });

  // Services
  const [selSvcs,   setSelSvcs]  = useState<SelSvc[]>([]);
  const [svcSearch, setSvcSearch] = useState("");
  const [svcOpen,   setSvcOpen]  = useState(false);

  // Guest
  const [guestSearch,   setGuestSearch]   = useState("");
  const [guestId,       setGuestId]       = useState("");
  const [guestOpen,     setGuestOpen]     = useState(false);
  const [showNewGuest,  setShowNewGuest]  = useState(false);
  const [newGuestName,  setNewGuestName]  = useState("");

  // Materials
  const [showMats,  setShowMats]  = useState(false);
  const [matRows,   setMatRows]   = useState<MatRow[]>([{ name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }]);
  const [matSearch, setMatSearch] = useState("");
  const [matOpen,   setMatOpen]   = useState(false);
  const [activeMat, setActiveMat] = useState(0);

  // Date + amount
  const [date,      setDate]      = useState(() => new Date().toISOString().slice(0, 10));
  const [manualAmt, setManualAmt] = useState("");
  const [isManual,  setIsManual]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  function closeAll() { setSvcOpen(false); setGuestOpen(false); setMatOpen(false); }

  const filtGuests = guestSearch.trim()
    ? allGuests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase()))
    : allGuests;

  const filtMat = matSearch.trim()
    ? MAT_OPTIONS.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()))
    : MAT_OPTIONS;

  const autoTotal    = selSvcs.reduce((s, x) => s + x.price, 0);
  const matTotal     = matRows.reduce((s, r) => s + r.lineTotal, 0);
  const total        = isManual ? (parseFloat(manualAmt) || 0) : autoTotal;
  const requiresMat  = needsMaterial(selSvcs);
  const validMats    = matRows.filter(r => r.name.trim() && parseFloat(r.grams) > 0);
  const matOk        = !requiresMat || validMats.length > 0;
  const canSave      = total > 0 && matOk;

  // Auto-open material section when color service is selected
  useEffect(() => {
    if (requiresMat) setShowMats(true);
  }, [requiresMat]);

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

  function reset() {
    setSelSvcs([]); setSvcSearch(""); setSvcOpen(false);
    setGuestSearch(""); setGuestId(""); setShowNewGuest(false); setNewGuestName("");
    setShowMats(false); setMatRows([{ name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }]);
    setManualAmt(""); setIsManual(false);
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // 1. Guest card first (so we can link it)
      const validMats = matRows.filter(r => r.name.trim() && parseFloat(r.grams) > 0);
      let finalGuestId = guestId;
      if (showNewGuest && newGuestName.trim()) {
        const g = await createGuest.mutateAsync({ name: newGuestName.trim() });
        finalGuestId = g.id;
      }
      let cardId: string | undefined;
      if (finalGuestId) {
        const card = await createCard.mutateAsync({
          guestId: finalGuestId,
          workerId: userId,
          date,
          services: selSvcs.map(s => ({ name: s.name, price: s.price, duration: s.duration, gender: s.gender, categoryName: s.categoryName })),
          materials: validMats.map(r => ({
            name: r.name, brand: r.brand || undefined, colorCode: r.colorCode || undefined,
            grams: parseFloat(r.grams), unitPrice: r.unitPrice, lineTotal: r.lineTotal,
          })),
        });
        cardId = card.id;
      }

      // 2. Revenue entry — linked to guest card if any
      const genderLabel = (g?: string) => g === "nő" ? "Női" : g === "férfi" ? "Férfi" : g === "gyermek" ? "Gyermek" : "";
      const desc = selSvcs.length > 0
        ? selSvcs.map(s => [genderLabel(s.gender), s.name, s.categoryName].filter(Boolean).join(" ")).join(", ")
        : "Bevétel";
      await createFinance.mutateAsync({ type: "revenue", description: desc, amount: total, date, guestCardId: cardId });

      // 3. Material entry if any
      if (showMats && validMats.length > 0) {
        const matDesc = validMats.map(r => `${r.name} (${r.grams}g)`).join(", ");
        await createFinance.mutateAsync({ type: "material", description: matDesc, amount: matTotal, date, guestCardId: cardId });
      }

      onSaved();
      reset();
    } finally {
      setSaving(false);
    }
  }

  const lbl: React.CSSProperties = { fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" };

  const anyOpen = svcOpen || guestOpen || matOpen;

  return (
    <>
      {anyOpen && <div onClick={closeAll} style={{ position: "fixed", inset: 0, zIndex: 150 }} />}
    <div style={{ background: "var(--bg-panel)", border: "1px solid rgba(82,118,102,0.28)", borderRadius: 18, padding: "1.5rem 1.75rem", marginBottom: "2rem" }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.2em", color: "rgba(82,118,102,0.65)", textTransform: "uppercase", marginBottom: "1.25rem" }}>◈ Látogatás rögzítése</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Service picker ── */}
        <div>
          <span style={lbl}>Szolgáltatások</span>

          {/* Selected services */}
          {selSvcs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.55rem" }}>
              {selSvcs.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.65rem", background: "rgba(82,118,102,0.1)", border: "1px solid rgba(82,118,102,0.3)", borderRadius: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: "#527666", flex: 1, minWidth: 120 }}>{s.name}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "rgba(82,118,102,0.7)", fontWeight: 700 }}>{fmt(s.price)}</span>
                  {s.duration > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "var(--text-soft)" }}>{s.duration} perc</span>}
                  {(["nő", "férfi", "gyermek"] as const).map(g => {
                    const gColors: Record<string, { border: string; bg: string; text: string }> = {
                      nő:      { border: "rgba(232,180,200,0.7)", bg: "rgba(232,180,200,0.15)", text: "#e8b4c8" },
                      férfi:   { border: "rgba(122,158,200,0.7)", bg: "rgba(122,158,200,0.12)", text: "#7a9ec8" },
                      gyermek: { border: "rgba(167,139,250,0.7)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
                    };
                    const gc = gColors[g]!;
                    const active = s.gender === g;
                    return (
                      <button key={g} type="button"
                        onClick={() => setSelSvcs(p => p.map(x => x.id === s.id ? { ...x, gender: active ? undefined : g } : x))}
                        style={{ padding: "0.18rem 0.55rem", borderRadius: 5, border: `1px solid ${active ? gc.border : "var(--border)"}`, background: active ? gc.bg : "transparent", color: active ? gc.text : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s" }}>
                        {g === "nő" ? "Női" : g === "férfi" ? "Férfi" : "Gyermek"}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setSelSvcs(p => p.filter(x => x.id !== s.id))} style={{ background: "none", border: "none", color: "rgba(82,118,102,0.4)", cursor: "pointer", fontSize: "0.75rem", marginLeft: "0.2rem" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* + button + dropdown */}
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => { setSvcOpen(p => !p); setSvcSearch(""); }}
              style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.45rem 0.95rem", borderRadius: 9, border: `1px solid ${svcOpen ? "rgba(82,118,102,0.5)" : "rgba(82,118,102,0.25)"}`, background: svcOpen ? "rgba(82,118,102,0.1)" : "var(--bg-card)", color: svcOpen ? "#527666" : "var(--text-soft)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.18s" }}>
              <span style={{ fontSize: "1rem", lineHeight: 1, color: svcOpen ? "#527666" : "rgba(82,118,102,0.5)", fontWeight: 300 }}>＋</span>
              Szolgáltatás hozzáadása
            </button>

            {svcOpen && (
              <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid rgba(82,118,102,0.3)", borderRadius: 14, marginTop: "0.3rem", boxShadow: "0 16px 48px rgba(0,0,0,0.65)", overflow: "hidden" }}>
                {/* Search inside panel */}
                <div style={{ padding: "0.65rem 0.85rem", borderBottom: "1px solid rgba(82,118,102,0.1)" }}>
                  <input
                    value={svcSearch}
                    onChange={e => setSvcSearch(e.target.value)}
                    placeholder="Keress a szolgáltatások között…"
                    autoFocus
                    style={{ ...inputStyle, width: "100%", fontSize: "0.9rem", borderColor: "rgba(82,118,102,0.2)" }}
                  />
                </div>

                {/* Services grouped by category */}
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {categories.map(cat => {
                    const catSvcs = (cat.services as { id: string; name: string; price: number; duration: number }[]).filter(s =>
                      !svcSearch.trim() || s.name.toLowerCase().includes(svcSearch.toLowerCase()) || cat.name.toLowerCase().includes(svcSearch.toLowerCase())
                    );
                    if (catSvcs.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div style={{ padding: "0.5rem 0.9rem 0.2rem", fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.16em", color: "rgba(82,118,102,0.45)", textTransform: "uppercase" }}>
                          {cat.name}
                        </div>
                        {catSvcs.map(s => {
                          const already = !!selSvcs.find(x => x.id === s.id);
                          return (
                            <div key={s.id}
                              onMouseDown={() => {
                                if (already) {
                                  setSelSvcs(p => p.filter(x => x.id !== s.id));
                                } else {
                                  setSelSvcs(p => [...p, { id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: cat.name }]);
                                }
                              }}
                              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.9rem", cursor: "pointer", transition: "background 0.12s", background: already ? "rgba(82,118,102,0.08)" : "transparent" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = already ? "rgba(82,118,102,0.12)" : "rgba(82,118,102,0.06)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = already ? "rgba(82,118,102,0.08)" : "transparent"; }}>
                              <span style={{ width: 14, flexShrink: 0, color: "#527666", fontSize: "0.7rem", textAlign: "center" }}>{already ? "✓" : ""}</span>
                              <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: already ? "#527666" : "var(--text-primary)", flex: 1 }}>{s.name}</span>
                              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: already ? "#527666" : "var(--text-soft)", fontWeight: 700, flexShrink: 0 }}>{fmt(s.price)}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Guest ── */}
        <div>
          <span style={lbl}>Vendég (opcionális — receptkönyvbe kerül)</span>
          {!showNewGuest ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input value={guestSearch}
                  onChange={e => { setGuestSearch(e.target.value); setGuestOpen(true); setGuestId(""); }}
                  onFocus={() => setGuestOpen(true)}
                  onBlur={() => setTimeout(() => setGuestOpen(false), 150)}
                  placeholder="Vendég keresése…"
                  style={{ ...inputStyle, borderColor: guestId ? "rgba(167,139,250,0.5)" : "var(--border)" }} />
                {guestId && <span style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#a78bfa", fontSize: "0.8rem" }}>✓</span>}
                {guestOpen && filtGuests.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, marginTop: "0.25rem", maxHeight: 160, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                    {filtGuests.map(g => (
                      <div key={g.id} onMouseDown={() => { setGuestId(g.id); setGuestSearch(g.name); setGuestOpen(false); }}
                        style={{ padding: "0.5rem 0.9rem", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", transition: "background 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        {g.name}{g.phone && <span style={{ color: "var(--text-soft)", fontSize: "0.82rem", marginLeft: "0.5rem" }}>{g.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => { setShowNewGuest(true); setGuestSearch(""); setGuestId(""); }}
                style={{ padding: "0 1rem", borderRadius: 10, border: "1px solid rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.1em", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.08)"; }}>
                ＋ Új vendég
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={newGuestName} onChange={e => setNewGuestName(e.target.value)} placeholder="Új vendég neve…" autoFocus style={{ ...inputStyle, flex: 1, borderColor: "rgba(167,139,250,0.4)" }} />
              <button type="button" onClick={() => { setShowNewGuest(false); setNewGuestName(""); }} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-soft)", cursor: "pointer", padding: "0 0.75rem" }}>✕</button>
            </div>
          )}
        </div>

        {/* ── Szín recept toggle ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <button type="button"
              onClick={() => { if (!requiresMat) setShowMats(p => !p); }}
              style={{ background: showMats ? "rgba(200,162,68,0.1)" : "transparent", border: `1px solid ${requiresMat && !matOk ? "#c47878" : showMats ? "rgba(200,162,68,0.4)" : "var(--border)"}`, borderRadius: 8, color: showMats ? "#c8a244" : "var(--text-soft)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", cursor: requiresMat ? "default" : "pointer", padding: "0.38rem 0.85rem", transition: "all 0.2s" }}>
              ✦ {showMats ? "Szín recept ▾" : "Szín recept hozzáadása"}
            </button>
            {requiresMat && !matOk && (
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", color: "#c47878", animation: "fadeInUp 0.3s ease" }}>
                ⚠ Festéshez szín recept kötelező
              </span>
            )}
            {requiresMat && matOk && (
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", color: "#527666" }}>
                ✓ Szín recept kitöltve
              </span>
            )}
          </div>

          {showMats && (
            <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {matRows.map((row, i) => (
                <div key={i} style={{ background: "rgba(200,162,68,0.04)", border: "1px solid rgba(200,162,68,0.18)", borderRadius: 10, padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", gap: "0.45rem" }}>
                    <div style={{ flex: 2, position: "relative" }}>
                      <input value={row.name}
                        onChange={e => { updateMat(i, "name", e.target.value); setActiveMat(i); setMatSearch(e.target.value); setMatOpen(true); }}
                        onFocus={() => { setActiveMat(i); setMatSearch(row.name); setMatOpen(true); }}
                        onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                        placeholder="Anyag neve…"
                        style={{ ...inputStyle, fontSize: "0.92rem", borderColor: "rgba(200,162,68,0.2)" }} />
                      {matOpen && activeMat === i && filtMat.length > 0 && (
                        <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid rgba(200,162,68,0.3)", borderRadius: 10, marginTop: "0.2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                          {filtMat.map(m => (
                            <div key={m.name} onMouseDown={() => { updateMat(i, "name", m.name); updateMat(i, "unitPrice", m.unitPrice); setMatSearch(""); setMatOpen(false); }}
                              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.85rem", cursor: "pointer", transition: "background 0.12s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(200,162,68,0.1)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "#c8a244", fontWeight: 700 }}>{m.unitPrice} Ft/{m.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={row.brand} onChange={e => updateMat(i, "brand", e.target.value)} placeholder="Márka" style={{ ...inputStyle, flex: 1, fontSize: "0.92rem" }} />
                    <input value={row.colorCode} onChange={e => updateMat(i, "colorCode", e.target.value)} placeholder="Színkód" style={{ ...inputStyle, flex: 0.8, fontSize: "0.92rem" }} />
                    <button type="button" onClick={() => setMatRows(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", alignSelf: "center" }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input type="number" value={row.grams} onChange={e => updateMat(i, "grams", e.target.value)} placeholder="Gramm" min="0" step="any"
                      style={{ ...inputStyle, flex: 1, fontSize: "0.9rem", textAlign: "center" }} />
                    <span style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)", fontSize: "0.9rem" }}>g ×</span>
                    <span style={{ fontFamily: "var(--font-cormorant)", color: "rgba(200,162,68,0.7)", fontSize: "0.9rem", minWidth: 50 }}>{fmt(row.unitPrice)}</span>
                    <span style={{ color: "var(--text-soft)", fontSize: "0.85rem" }}>=</span>
                    <span style={{ fontFamily: "var(--font-playfair)", color: "#c8a244", fontWeight: 700, fontSize: "0.92rem", marginLeft: "auto" }}>{fmt(row.lineTotal)}</span>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setMatRows(p => [...p, { name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }])}
                style={{ alignSelf: "flex-start", background: "none", border: "1px solid rgba(200,162,68,0.22)", borderRadius: 6, color: "rgba(200,162,68,0.7)", cursor: "pointer", fontSize: "0.68rem", padding: "0.2rem 0.65rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
                ＋ Sor
              </button>
              {matTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0.5rem 0", borderTop: "1px solid rgba(200,162,68,0.1)" }}>
                  <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(200,162,68,0.45)" }}>ANYAG ÖSSZESEN</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: "#a06830", fontWeight: 700 }}>{fmt(matTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Visit total ── */}
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.7rem 1rem", background: "rgba(82,118,102,0.06)", border: "1px solid rgba(82,118,102,0.22)", borderRadius: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c8a244 0%, #a06830 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(200,162,68,0.4)" }}>
              <span style={{ color: "#fff", fontFamily: "var(--font-cinzel)", fontSize: "0.38rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Ft</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Végösszeg</div>
              <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", alignItems: "center" }}>
                {autoTotal > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#527666" }}>◈ Munkadíj: {fmt(autoTotal)}</span>}
                {matTotal > 0  && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#a06830" }}>✦ Anyag: {fmt(matTotal)}</span>}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.45rem", color: "#527666", fontWeight: 700, letterSpacing: "-0.01em" }}>{fmt(total)}</div>
          </div>
        )}

        {/* ── Date + amount + save ── */}
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-end", flexWrap: "wrap", paddingTop: "0.25rem", borderTop: "1px solid var(--bg-active)" }}>
          <div style={{ flex: "0 0 auto" }}>
            <span style={lbl}>Dátum</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: 160, colorScheme: "dark" }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <span style={{ ...lbl, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Összeg (Ft) {!isManual && autoTotal > 0 && <span style={{ color: "rgba(82,118,102,0.7)", fontFamily: "var(--font-cinzel)", fontSize: "0.45rem" }}>AUTO</span>}
            </span>
            <input type="number" min="0"
              value={isManual ? manualAmt : autoTotal > 0 ? String(autoTotal) : ""}
              onChange={e => { setManualAmt(e.target.value); setIsManual(true); }}
              placeholder="0"
              style={{ ...inputStyle, borderColor: total > 0 ? "rgba(82,118,102,0.4)" : "var(--border)" }} />
          </div>
          <button onClick={handleSave} disabled={saving || !canSave}
            style={{ flex: "0 0 auto", padding: "0.7rem 1.5rem", borderRadius: 10, border: "none", background: canSave ? "linear-gradient(120deg,#4a7a6a 0%,#527666 50%,#4a7a6a 100%)" : "var(--bg-card)", backgroundSize: "200% auto", color: canSave ? "#fff" : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.15em", cursor: canSave ? "pointer" : "not-allowed", animation: canSave ? "shimmer 3s linear infinite" : "none", opacity: saving ? 0.7 : 1, transition: "all 0.2s", alignSelf: "flex-end" }}>
            {saving ? "Mentés..." : "Rögzítés ◈"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Other expense modal ───────────────────────────────────────────────────────
function OtherModal({ onClose, year, month, isAdmin }: { onClose: () => void; year: number; month: number; isAdmin: boolean }) {
  const utils = api.useUtils();
  const [type, setType] = useState<"material" | "wage">("material");
  const [date, setDate] = useState(() => new Date(year, month - 1, new Date().getDate()).toISOString().slice(0, 10));

  type SelMat = { id: string; name: string; unitPrice: number; qty: string };
  const [matSearch,    setMatSearch]    = useState("");
  const [matOpen,      setMatOpen]      = useState(false);
  const [selectedMats, setSelectedMats] = useState<SelMat[]>([]);
  const [wageDesc,     setWageDesc]     = useState("");
  const [wageAmt,      setWageAmt]      = useState("");

  const { data: categories = [] } = api.services.listCategories.useQuery();
  const allServices: { id: string; name: string; price: number; categoryName: string }[] = [];
  for (const c of categories) {
    for (const s of (c.services ?? [])) allServices.push({ id: s.id, name: s.name, price: s.price, categoryName: c.name });
  }

  const filteredMat = matSearch.trim()
    ? allServices.filter(s => s.name.toLowerCase().includes(matSearch.toLowerCase()) || s.categoryName.toLowerCase().includes(matSearch.toLowerCase()))
    : allServices;

  function lineTotal(m: SelMat) { const q = parseFloat(m.qty); return isNaN(q) || q <= 0 ? 0 : q * m.unitPrice; }
  const matTotal = selectedMats.reduce((s, m) => s + lineTotal(m), 0);

  const create = api.finance.create.useMutation({
    onSuccess: async () => { await utils.finance.list.invalidate(); onClose(); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "material") {
      if (!selectedMats.length) return;
      const desc = selectedMats.map(m => { const q = parseFloat(m.qty); return isNaN(q) ? m.name : `${m.name} (${q}×)`; }).join(", ");
      create.mutate({ type, description: desc, amount: matTotal, date });
    } else {
      create.mutate({ type, description: wageDesc, amount: parseFloat(wageAmt), date });
    }
  }

  const cfg = TYPE_CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2.25rem 2.5rem", width: "100%", maxWidth: 460, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}>
        <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.9rem", letterSpacing: "0.16em", color: "var(--color-teal)", marginBottom: "1.75rem" }}>Egyéb kiadás rögzítése</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Type — staff csak anyagköltséget rögzíthet */}
          {isAdmin && (
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {(["material","wage"] as const).map(key => {
                const c = TYPE_CONFIG[key];
                return (
                  <button key={key} type="button" onClick={() => setType(key)}
                    style={{ flex: 1, padding: "0.6rem 0.5rem", borderRadius: 8, border: type === key ? `1px solid ${c.color}88` : "1px solid var(--bg-active)", background: type === key ? c.dim : "transparent", color: type === key ? c.color : "var(--text-soft)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" }}>
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Material multi-picker */}
          {type === "material" && (
            <div>
              {selectedMats.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.65rem" }}>
                  {selectedMats.map(m => (
                    <div key={m.id} style={{ background: "rgba(200,162,68,0.06)", border: "1px solid rgba(200,162,68,0.22)", borderRadius: 10, padding: "0.55rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                        <button type="button" onClick={() => setSelectedMats(p => p.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="number" value={m.qty} min="0" step="any"
                          onChange={e => setSelectedMats(p => p.map(x => x.id === m.id ? { ...x, qty: e.target.value } : x))}
                          style={{ ...inputStyle, width: 72, padding: "0.35rem 0.5rem", fontSize: "0.9rem", textAlign: "center" }} />
                        <span style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)", fontSize: "0.9rem" }}>×</span>
                        <span style={{ fontFamily: "var(--font-cormorant)", color: "rgba(200,162,68,0.7)", fontSize: "0.9rem" }}>{fmt(m.unitPrice)}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", color: "#a06830", fontWeight: 700, fontSize: "0.95rem", marginLeft: "auto" }}>{fmt(lineTotal(m))}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0.5rem 0", borderTop: "1px solid rgba(160,104,48,0.15)" }}>
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.14em", color: "rgba(200,162,68,0.5)" }}>ÖSSZESEN</span>
                    <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#a06830", fontWeight: 700 }}>{fmt(matTotal)}</span>
                  </div>
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input value={matSearch}
                  onChange={e => { setMatSearch(e.target.value); setMatOpen(true); }}
                  onFocus={() => setMatOpen(true)}
                  onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                  placeholder="Keress az árlistán…"
                  style={{ ...inputStyle, borderColor: "rgba(200,162,68,0.2)" }} />
                {matOpen && filteredMat.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid rgba(200,162,68,0.3)", borderRadius: 12, marginTop: "0.25rem", maxHeight: 200, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.65)" }}>
                    {filteredMat.map((m, i) => {
                      const already = !!selectedMats.find(s => s.id === m.id);
                      const showCat = i === 0 || filteredMat[i-1]?.categoryName !== m.categoryName;
                      return (
                        <div key={m.id}>
                          {showCat && <div style={{ padding: "0.4rem 0.9rem 0.15rem", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(200,162,68,0.4)", textTransform: "uppercase" }}>{m.categoryName}</div>}
                          <div onMouseDown={() => { if (!already) setSelectedMats(p => [...p, { id: m.id, name: m.name, unitPrice: m.price, qty: "1" }]); setMatSearch(""); setMatOpen(false); }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.9rem", cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1, transition: "background 0.15s" }}
                            onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "rgba(200,162,68,0.1)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            {already && <span style={{ color: "#a06830", fontSize: "0.7rem" }}>✓</span>}
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: "#a06830", fontWeight: 700 }}>{fmt(m.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wage */}
          {type === "wage" && (
            <>
              <div>
                <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>Leírás</label>
                <input value={wageDesc} onChange={e => setWageDesc(e.target.value)} placeholder="pl. Bér — október" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>Összeg (Ft)</label>
                <input type="number" value={wageAmt} onChange={e => setWageAmt(e.target.value)} placeholder="0" required min="1" style={inputStyle} />
              </div>
            </>
          )}

          {/* Date */}
          <div>
            <label style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>Dátum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.8rem", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer" }}>Mégse</button>
            <button type="submit" disabled={create.isPending || (type === "material" && !selectedMats.length)} className="btn-gold"
              style={{ flex: 2, padding: "0.8rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em" }}>
              {create.isPending ? "Mentés..." : "Mentés ✦"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const USER_COLORS: Record<string, string> = {
  "Felicia": "#c9906a",
  "Gitta":   "#9878b8",
  "Lili":    "#e8a0b8",
};
export function userColor(name: string | null | undefined) {
  return USER_COLORS[name ?? ""] ?? "var(--color-teal)";
}

export function buildVisitGroups<T extends {
  id: string; date: string | Date; type: string; amount: number; guestCardId?: string | null;
  createdBy?: { id: string; name: string | null } | null;
}>(visibleEntries: T[]) {
  type VG = { key: string; date: string; cardId: string | null; entries: T[]; totalRevenue: number; totalMaterial: number };
  const visitGroups: VG[] = [];
  const cardGroupMap: Record<string, VG> = {};
  const dayCreatorMap: Record<string, VG> = {};
  visibleEntries.forEach(e => {
    const dateKey   = toDateStr(new Date(e.date));
    const cardId    = e.guestCardId ?? null;
    const creatorId = e.createdBy?.id ?? "";
    if (cardId && cardGroupMap[cardId]) {
      const g = cardGroupMap[cardId]!;
      g.entries.push(e);
      if (e.type === "revenue")  g.totalRevenue  += e.amount;
      if (e.type === "material") g.totalMaterial += e.amount;
    } else if (!cardId && e.type === "material" && dayCreatorMap[`${dateKey}|${creatorId}`]) {
      const g = dayCreatorMap[`${dateKey}|${creatorId}`]!;
      g.entries.push(e);
      g.totalMaterial += e.amount;
    } else {
      const g: VG = { key: cardId ?? e.id, date: dateKey, cardId, entries: [e], totalRevenue: e.type === "revenue" ? e.amount : 0, totalMaterial: e.type === "material" ? e.amount : 0 };
      visitGroups.push(g);
      if (cardId) cardGroupMap[cardId] = g;
      if (!cardId && e.type === "revenue") dayCreatorMap[`${dateKey}|${creatorId}`] = g;
    }
  });
  const byDate: Record<string, VG[]> = {};
  visitGroups.forEach(g => { (byDate[g.date] ??= []).push(g); });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  return { visitGroups, byDate, sortedDates };
}

export default function FinancesClient({ isAdmin = true, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayStr = toDateStr(now);

  const [showOther, setShowOther] = useState(false);

  const utils = api.useUtils();
  const inv = () => { void utils.finance.list.invalidate(); void utils.calendar.month.invalidate(); };
  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month, filterUserId: !isAdmin ? userId : undefined });
  const del        = api.finance.delete.useMutation({ onSuccess: inv });
  const updateDate = api.finance.updateDate.useMutation({ onSuccess: inv });

  const visibleEntries = isAdmin ? entries : entries.filter(e => e.type === "revenue" || e.type === "material");
  const { byDate, sortedDates } = buildVisitGroups(visibleEntries);

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      {showOther && <OtherModal onClose={() => setShowOther(false)} year={year} month={month} isAdmin={isAdmin} />}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", textShadow: "0 0 24px var(--border)", animation: "float 4s ease-in-out infinite" }}>Pénzügyek ✦</h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem" }}>
            {isAdmin ? "Látogatás és anyagköltség rögzítése" : "Saját bevételeid rögzítése"}
          </p>
        </div>
        <button onClick={() => setShowOther(true)}
          style={{ padding: "0.7rem 1.25rem", borderRadius: 10, border: "1px solid rgba(160,104,48,0.35)", background: "rgba(160,104,48,0.08)", color: "#a06830", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(160,104,48,0.15)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(160,104,48,0.08)"; }}>
          {isAdmin ? "✦ Anyag / Bér" : "✦ Anyagköltség rögzítése"}
        </button>
      </div>

      {/* Visit entry form */}
      <VisitEntry userId={userId} onSaved={inv} />

      {/* Current month entry list */}
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        ◈ {MONTHS[month - 1]} bejegyzései
      </div>

      <EntryList
        byDate={byDate}
        sortedDates={sortedDates}
        todayStr={todayStr}
        isAdmin={isAdmin}
        ownerId={userId}
        isLoading={isLoading}
        onDelete={(ids) => ids.forEach(id => del.mutate({ id }))}
        onUpdateDate={(ids, date, cardId) => updateDate.mutate({ entryIds: ids, date, guestCardId: cardId })}
        isSavingDate={updateDate.isPending}
        emptyMessage="Ebben a hónapban még nincsenek bejegyzések. ✦"
      />
    </div>
  );
}
