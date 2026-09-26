"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { toDateStr } from "~/lib/date";
import { PriceInput } from "~/app/dashboard/_price-input";
import { ColorRecipeEditor, emptyMatRow } from "~/app/dashboard/_color-recipe";
import { catShort, serviceMatches } from "~/lib/service-label";

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

/** Egy festék (árnyalat) a színreceptben; a `gid` fogja össze az egy anyaghoz tartozókat a felületen. */
export type MatRow = { gid?: string; name: string; brand: string; colorCode: string; grams: string; unitPrice: number; lineTotal: number };
/** `listPrice`: az árlistabeli ár a kiválasztáskor — ha a kártyán átírták, ehhez mérjük. */
export type SvcRow = { uid: string; id: string; name: string; price: number; listPrice?: number; duration: number; categoryName: string; gender?: string; hours: number };

function parseHours(rawName: string, rawPrice: number): { name: string; price: number; hours: number } {
  const m = /\((\d+(?:[.,]\d+)?) óra\)$/.exec(rawName.trim());
  if (m) {
    const hours = parseFloat(m[1]!.replace(",", "."));
    const basePrice = hours > 0 ? rawPrice / hours : rawPrice;
    return { name: rawName.replace(/\s*\(\d+(?:[.,]\d+)? óra\)$/, ""), price: basePrice, hours };
  }
  return { name: rawName, price: rawPrice, hours: 1 };
}

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
  const { data: allWorkers = [] } = api.calendar.users.useQuery();
  // Csak aktív dolgozó választható; a kártya jelenlegi dolgozóját megtartjuk, ha archivált.
  const workers = allWorkers.filter(u => u.active !== false || u.id === card.worker.id);
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

  const [date,     setDate]     = useState(() => toDateStr(new Date(card.date)));
  const [workerId, setWorkerId] = useState(card.worker.id);
  const [notes,    setNotes]    = useState(card.notes ?? "");

  const [discountType, setDiscountType] = useState<"%" | "Ft">("Ft");
  const [discountVal,  setDiscountVal]  = useState<string>(() => {
    const initSvcTotal = card.services.reduce((s, sv) => s + sv.price, 0);
    const initMatTotal = card.materials.reduce((s, m) => s + m.lineTotal, 0);
    const implied = Math.round(initSvcTotal - (card.total - initMatTotal));
    return implied > 0 ? String(implied) : "";
  });

  const [selSvcs, setSelSvcs] = useState<SvcRow[]>(() =>
    card.services.map(s => {
      const parsed = parseHours(s.name, s.price);
      return { uid: crypto.randomUUID(), id: s.id, ...parsed, duration: s.duration ?? 0, categoryName: s.categoryName ?? "", gender: s.gender ?? undefined };
    })
  );
  const [svcSearch, setSvcSearch] = useState("");
  const [svcOpen,   setSvcOpen]   = useState(false);

  const [matRows, setMatRows] = useState<MatRow[]>(() =>
    card.materials.length > 0
      ? card.materials.map(m => ({ name: m.name, brand: m.brand ?? "", colorCode: m.colorCode ?? "", grams: String(m.grams), unitPrice: m.unitPrice, lineTotal: m.lineTotal }))
      : [emptyMatRow()]
  );

  const allSvcs: Omit<SvcRow, "uid" | "hours">[] = [];
  // Csak annak az árlistája, aki a munkát végezte — különben a mester kártyájára
  // a kezdő vagy a kozmetikus azonos nevű tétele is bekerülhet.
  const workerPriceList = workers.find(u => u.id === workerId)?.priceListType;
  const pickerCategories = workerPriceList ? categories.filter(c => c.priceListType === workerPriceList) : categories;
  pickerCategories.forEach(c => c.services.forEach((s: { id: string; name: string; price: number; duration: number }) =>
    allSvcs.push({ id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: c.name })
  ));
  const filtSvcs = svcSearch.trim() ? allSvcs.filter(s => serviceMatches(svcSearch, s.name, s.categoryName)) : allSvcs;


  const svcTotal   = selSvcs.reduce((s, x) => s + x.price * x.hours, 0);
  const matTotal   = matRows.reduce((s, r) => s + r.lineTotal, 0);
  const discountNum = parseFloat(discountVal) || 0;
  const discountAmt = discountNum > 0 && svcTotal > 0
    ? discountType === "%" ? Math.round(svcTotal * Math.min(discountNum, 100) / 100) : Math.min(discountNum, svcTotal)
    : 0;
  const discountedSvcTotal = Math.max(0, svcTotal - discountAmt);
  const total = discountedSvcTotal + matTotal;

  function handleSave() {
    const mats = matRows.filter(r => r.name.trim() && parseFloat(r.grams) > 0)
      .map(r => ({ name: r.name, brand: r.brand || undefined, colorCode: r.colorCode || undefined, grams: parseFloat(r.grams), unitPrice: r.unitPrice, lineTotal: r.lineTotal }));
    updateCard.mutate({
      id: card.id, date, workerId, notes: notes || undefined,
      services:  selSvcs.map(s => ({ name: s.hours !== 1 ? `${s.name} (${s.hours} óra)` : s.name, price: s.price * s.hours, duration: Math.round(s.duration * s.hours), gender: s.gender, categoryName: s.categoryName })),
      materials: mats,
      discount: discountAmt,
    });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-outer-pad" style={{ minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem" }}>
        <div className="modal-card" style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem 2.25rem", width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1rem", letterSpacing: "0.14em", color: gold, margin: 0 }}>✎ Kártya szerkesztése</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: dim, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Worker + date */}
            <div className="modal-worker-date" style={{ display: "flex", gap: "0.75rem" }}>
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
                  {selSvcs.map(s => (
                    <div key={s.uid} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.65rem", background: "var(--bg-active)", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--color-teal)", flex: 1 }}>{s.name}{s.categoryName && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)", marginLeft: "0.35rem" }}>· {catShort(s.categoryName)}</span>}</span>
                      <input
                        type="number" min="0.5" step="0.5"
                        value={s.hours}
                        onChange={e => setSelSvcs(p => p.map(x => x.uid === s.uid ? { ...x, hours: parseFloat(e.target.value) || 1 } : x))}
                        onFocus={e => e.target.select()}
                        style={{ width: 52, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: "0.18rem 0.4rem", color: "var(--text-primary)", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dim }}>óra</span>
                      <PriceInput value={s.price} listPrice={s.listPrice} onChange={v => setSelSvcs(p => p.map(x => x.uid === s.uid ? { ...x, price: v } : x))} />
                      {s.hours !== 1 && <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>/óra</span>}
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price * s.hours)}</span>
                      {(["nő", "férfi", "gyermek"] as const).map(g => {
                        const c = gColors[g]!; const active = s.gender === g;
                        return (
                          <button key={g} type="button"
                            onClick={() => setSelSvcs(p => p.map(x => x.uid === s.uid ? { ...x, gender: active ? undefined : g } : x))}
                            style={{ padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${active ? c.border : "var(--border)"}`, background: active ? c.bg : "transparent", color: active ? c.text : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.09em", cursor: "pointer" }}>
                            {g === "nő" ? "Női" : g === "férfi" ? "Férfi" : "Gyermek"}
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setSelSvcs(p => p.filter(x => x.uid !== s.uid))}
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
                      const showCat = i === 0 || filtSvcs[i-1]?.categoryName !== s.categoryName;
                      return (
                        <div key={s.id}>
                          {showCat && <div style={{ padding: "0.35rem 0.9rem 0.1rem", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.14em", color: "var(--text-dim)", textTransform: "uppercase" }}>{s.categoryName}</div>}
                          <div onMouseDown={() => { setSelSvcs(p => [...p, { uid: crypto.randomUUID(), id: s.id, name: s.name, price: s.price, listPrice: s.price, duration: s.duration ?? 0, categoryName: s.categoryName, hours: 1 }]); setSvcSearch(""); setSvcOpen(false); }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.9rem", cursor: "pointer" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: cream, flex: 1 }}>{s.name}{s.categoryName && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)", marginLeft: "0.35rem" }}>· {catShort(s.categoryName)}</span>}</span>
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
              <label style={{ ...labelStyle, marginBottom: "0.5rem", display: "block" }}>✦ Szín recept</label>
              <ColorRecipeEditor rows={matRows} onChange={setMatRows} options={MAT_OPTIONS} />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. következő időpont…" style={inputStyle} />
            </div>

            {/* Discount */}
            {svcTotal > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <label style={labelStyle}>Kedvezmény</label>
                <div className="modal-discount-row" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    {(["%", "Ft"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setDiscountType(t)}
                        style={{ padding: "0.35rem 0.7rem", background: discountType === t ? "var(--bg-active)" : "transparent", color: discountType === t ? gold : dim, border: "none", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input type="number" min="0" step="any" value={discountVal} onChange={e => setDiscountVal(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0"
                    style={{ ...inputStyle, flex: 1, textAlign: "right" }} />
                  {discountAmt > 0 && (
                    <span className="modal-discount-result" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--color-danger)", whiteSpace: "nowrap" }}>
                      − {fmt(discountAmt)} → {fmt(discountedSvcTotal)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Total + save */}
            <div className="modal-total-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: dim }}>
                {svcTotal > 0 && <span>Szolgáltatás: {discountAmt > 0 ? fmt(discountedSvcTotal) : fmt(svcTotal)}</span>}
                {discountAmt > 0 && <span style={{ color: "var(--color-danger)", marginLeft: "0.3rem" }}>− {fmt(discountAmt)}</span>}
                {svcTotal > 0 && matTotal > 0 && <span style={{ margin: "0 0.4rem" }}>·</span>}
                {matTotal > 0 && <span>Anyag: {fmt(matTotal)}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em", color: dim }}>
                VÉGÖSSZEG{" "}
                {discountAmt > 0 && (
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: dim, textDecoration: "line-through", marginLeft: "0.4rem" }}>{fmt(svcTotal + matTotal)}</span>
                )}
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", color: gold, fontWeight: 700, marginLeft: "0.5rem" }}>{fmt(total)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button"
                onClick={() => { if (confirm("Törlöd ezt a kártyát?")) deleteCard.mutate({ id: card.id }); }}
                disabled={deleteCard.isPending}
                style={{ padding: "0.8rem 1.1rem", borderRadius: 10, background: "transparent", border: "1px solid rgba(248,113,113,0.3)", color: "rgba(248,113,113,0.6)", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-danger)"; (e.currentTarget as HTMLElement).style.color = "var(--color-danger)"; }}
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
