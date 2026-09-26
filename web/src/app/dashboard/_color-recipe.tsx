"use client";

/**
 * Színrecept a kártyán: anyag + márka, alatta a festékek névvel és grammal.
 *
 * Eddig egy sorban volt az anyag, a márka és a színkód, mind szabad szövegként.
 * Keverésnél minden árnyalat grammokkal egy mezőbe került ("5.55 22g, 5.66 51g"),
 * a márka pedig többféleképpen (Echos / echosline). Most a márka listából
 * választható, és egy anyagon belül árnyalatonként külön sor van.
 *
 * A mentett forma nem változik: árnyalatonként egy `MatRow` (és így egy
 * GuestCardMaterial). A csoportosítás csak a felületé — az egymás utáni,
 * azonos `gid`-ű (régi soroknál azonos anyagú és márkájú) sorok egy anyag.
 */
import { useState } from "react";
import { api } from "~/trpc/react";
import type { MatRow } from "~/app/dashboard/_card-edit-modal";

export type MatOption = { name: string; unitPrice: number; unit: string };

const NEW_BRAND = "__uj_marka__";

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

function groupKey(r: MatRow) {
  return r.gid ?? `${r.name}|${r.brand}|${r.unitPrice}`;
}

type Group = { start: number; end: number; key: string };

function groupsOf(rows: MatRow[]): Group[] {
  const out: Group[] = [];
  rows.forEach((r, i) => {
    const k = groupKey(r);
    const last = out[out.length - 1];
    if (last && last.key === k) last.end = i + 1;
    else out.push({ start: i, end: i + 1, key: k });
  });
  return out;
}

function withTotal(r: MatRow): MatRow {
  const g = parseFloat(r.grams);
  return { ...r, lineTotal: isNaN(g) ? 0 : g * r.unitPrice };
}

export function emptyMatRow(): MatRow {
  return { gid: crypto.randomUUID(), name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 };
}

const input: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "0.5rem 0.7rem", color: "var(--text-primary)", fontFamily: "var(--font-cormorant)",
  fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box",
};

export function ColorRecipeEditor({ rows, onChange, options, accent = "var(--border)" }: {
  rows: MatRow[];
  onChange: (rows: MatRow[]) => void;
  options: MatOption[];
  accent?: string;
}) {
  const utils = api.useUtils();
  const { data: brands = [] } = api.materials.brands.useQuery();
  const addBrand = api.materials.addBrand.useMutation({ onSuccess: () => void utils.materials.brands.invalidate() });

  const [openAt,   setOpenAt]   = useState<number | null>(null); // melyik csoport anyag-listája nyitott
  const [search,   setSearch]   = useState("");
  const [newBrand, setNewBrand] = useState<{ at: number; text: string } | null>(null);

  const groups = groupsOf(rows);

  /** A csoport minden sorára: így marad együtt, ha a nevét vagy márkáját átírják. */
  function setGroup(g: Group, patch: Partial<MatRow>) {
    const gid = rows[g.start]!.gid ?? crypto.randomUUID();
    onChange(rows.map((r, i) => (i >= g.start && i < g.end ? withTotal({ ...r, ...patch, gid }) : r)));
  }
  function setRow(i: number, patch: Partial<MatRow>) {
    onChange(rows.map((r, j) => (j === i ? withTotal({ ...r, ...patch }) : r)));
  }
  function addShade(g: Group) {
    const base = rows[g.start]!;
    const gid = base.gid ?? crypto.randomUUID();
    const next = rows.map((r, i) => (i >= g.start && i < g.end ? { ...r, gid } : r));
    next.splice(g.end, 0, { ...base, gid, colorCode: "", grams: "", lineTotal: 0 });
    onChange(next);
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }
  function removeGroup(g: Group) {
    onChange(rows.filter((_, j) => j < g.start || j >= g.end));
  }

  async function saveNewBrand(g: Group) {
    const name = newBrand?.text.trim();
    setNewBrand(null);
    if (!name) return;
    const b = await addBrand.mutateAsync({ name });
    setGroup(g, { brand: b.name });
  }

  const filtered = search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {groups.map((g, gi) => {
        const head = rows[g.start]!;
        const opt = options.find(o => o.name === head.name);
        const unit = opt?.unit ?? "g";
        const byWeight = unit === "g";
        const groupTotal = rows.slice(g.start, g.end).reduce((s, r) => s + r.lineTotal, 0);
        const groupGrams = rows.slice(g.start, g.end).reduce((s, r) => s + (parseFloat(r.grams) || 0), 0);
        const brandKnown = !head.brand || brands.some(b => b.name === head.brand);
        return (
          <div key={`${g.key}-${gi}`} style={{ background: "var(--bg-today)", border: `1px solid ${accent}`, borderRadius: 10, padding: "0.7rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {/* Anyag + márka */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 150px", position: "relative" }}>
                <input value={head.name}
                  onChange={e => { setGroup(g, { name: e.target.value }); setSearch(e.target.value); setOpenAt(gi); }}
                  onFocus={() => { setSearch(""); setOpenAt(gi); }}
                  onBlur={() => setTimeout(() => setOpenAt(null), 150)}
                  placeholder="Anyag (pl. Tartós festék)…" style={input} />
                {openAt === gi && filtered.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                    {filtered.map(o => (
                      <div key={o.name}
                        onMouseDown={() => { setGroup(g, { name: o.name, unitPrice: o.unitPrice }); setOpenAt(null); }}
                        style={{ display: "flex", gap: "0.5rem", padding: "0.45rem 0.85rem", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{o.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "var(--color-teal)", fontWeight: 700 }}>{o.unitPrice} Ft/{o.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: "1 1 120px" }}>
                {newBrand?.at === gi ? (
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <input autoFocus value={newBrand.text} placeholder="Új márka neve"
                      onChange={e => setNewBrand({ at: gi, text: e.target.value })}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void saveNewBrand(g); } if (e.key === "Escape") setNewBrand(null); }}
                      style={input} />
                    <button type="button" onClick={() => void saveNewBrand(g)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--color-teal)", cursor: "pointer", padding: "0 0.6rem" }}>✓</button>
                  </div>
                ) : (
                  <select value={head.brand}
                    onChange={e => { if (e.target.value === NEW_BRAND) setNewBrand({ at: gi, text: "" }); else setGroup(g, { brand: e.target.value }); }}
                    aria-label="Márka" style={{ ...input, color: head.brand ? "var(--text-primary)" : "var(--text-soft)" }}>
                    <option value="">Márka…</option>
                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    {!brandKnown && <option value={head.brand}>{head.brand}</option>}
                    <option value={NEW_BRAND}>＋ Új márka…</option>
                  </select>
                )}
              </div>

              <button type="button" onClick={() => removeGroup(g)} title="Anyag törlése"
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
            </div>

            {/* Festékek: név + gramm */}
            {rows.slice(g.start, g.end).map((r, k) => {
              const i = g.start + k;
              return (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", paddingLeft: "0.6rem", borderLeft: `2px solid ${accent}` }}>
                  <input value={r.colorCode} onChange={e => setRow(i, { colorCode: e.target.value })}
                    placeholder={byWeight ? "Festék / árnyalat, pl. 6.666" : "Megnevezés"} style={{ ...input, flex: 2 }} />
                  <input type="number" value={r.grams} onChange={e => setRow(i, { grams: e.target.value })}
                    placeholder={byWeight ? "gramm" : unit} min="0" step="any" style={{ ...input, flex: 1, textAlign: "center", minWidth: 70 }} />
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "var(--text-soft)", minWidth: 16 }}>{byWeight ? "g" : ""}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--color-teal)", fontWeight: 700, minWidth: 70, textAlign: "right" }}>{fmt(r.lineTotal)}</span>
                  <button type="button" onClick={() => removeRow(i)} title="Festék törlése"
                    style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "0.6rem" }}>
              <button type="button" onClick={() => addShade(g)}
                style={{ background: "none", border: "none", color: "var(--color-teal)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em", padding: 0 }}>
                ＋ Festék
              </button>
              {g.end - g.start > 1 && (
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "var(--text-soft)" }}>
                  összesen {groupGrams} {byWeight ? "g" : unit} · {fmt(groupTotal)}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => onChange([...rows, emptyMatRow()])}
        style={{ alignSelf: "flex-start", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--color-teal)", cursor: "pointer", fontSize: "0.7rem", padding: "0.25rem 0.7rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
        ＋ Anyag
      </button>
    </div>
  );
}
