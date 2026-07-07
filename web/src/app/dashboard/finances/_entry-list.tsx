"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { userColor } from "./_client";
import { entriesWageAmount, servicesWageAmount } from "~/lib/wage";

const iStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "0.6rem 0.85rem", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem", outline: "none", width: "100%", boxSizing: "border-box",
};

function parseExistingDiscount(desc: string, amount: number): { base: number; discount: number } {
  const m = /\((\d+)\s*Ft kedvezmény\)/.exec(desc);
  if (m) {
    const discount = parseInt(m[1]!, 10);
    return { base: amount + discount, discount };
  }
  return { base: amount, discount: 0 };
}

const lStyle: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.16em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

function StandaloneEditModal({ entryIds, initialAmount, initialDescription, initialDate, onClose }: {
  entryIds: string[];
  initialAmount: number;
  initialDescription: string;
  initialDate: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const updateEntry = api.finance.updateEntry.useMutation({
    onSuccess: () => { void utils.finance.list.invalidate(); onClose(); },
  });

  const parsed = parseExistingDiscount(initialDescription, initialAmount);

  const [baseAmt,      setBaseAmt]      = useState(String(parsed.base));
  const [desc,         setDesc]         = useState(initialDescription);
  const [date,         setDate]         = useState(initialDate);
  const [discountType, setDiscountType] = useState<"%" | "Ft">("Ft");
  const [discountVal,  setDiscountVal]  = useState(parsed.discount > 0 ? String(parsed.discount) : "");

  const base         = parseFloat(baseAmt) || 0;
  const discountNum  = parseFloat(discountVal) || 0;
  const discountAmt  = discountNum > 0 && base > 0
    ? discountType === "%" ? Math.round(base * Math.min(discountNum, 100) / 100) : Math.min(discountNum, base)
    : 0;
  const finalAmount  = Math.max(0, base - discountAmt);

  function handleSave() {
    if (base <= 0) return;
    const newDesc = discountAmt > 0
      ? desc.replace(/\s*\(\d+\s*Ft kedvezmény\)/, "") + ` (${discountAmt} Ft kedvezmény)`
      : desc.replace(/\s*\(\d+\s*Ft kedvezmény\)/, "");
    entryIds.forEach(id => updateEntry.mutate({ id, amount: finalAmount, description: newDesc, date }));
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const gold = "var(--color-teal)";
  const dim  = "var(--text-soft)";

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 18, padding: "2rem", width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.9rem", letterSpacing: "0.14em", color: gold, margin: 0 }}>✎ Bejegyzés szerkesztése</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: dim, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={lStyle}>Leírás</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} style={iStyle} />
          </div>
          <div>
            <label style={lStyle}>Bruttó összeg (Ft)</label>
            <input type="number" value={baseAmt} onChange={e => setBaseAmt(e.target.value)} min="0" step="100" style={iStyle} />
          </div>
          <div>
            <label style={lStyle}>Kedvezmény</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                {(["%", "Ft"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setDiscountType(t)}
                    style={{ padding: "0.35rem 0.7rem", background: discountType === t ? "var(--bg-active)" : "transparent", color: discountType === t ? gold : dim, border: "none", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                    {t}
                  </button>
                ))}
              </div>
              <input type="number" min="0" step="any" value={discountVal} onChange={e => setDiscountVal(e.target.value)}
                onFocus={e => e.target.select()} placeholder="0"
                style={{ ...iStyle, flex: 1, textAlign: "right" }} />
            </div>
            {discountAmt > 0 && (
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#f87171", marginTop: "0.35rem" }}>
                − {fmt(discountAmt)} → <strong>{fmt(finalAmount)}</strong>
              </div>
            )}
          </div>
          <div>
            <label style={lStyle}>Dátum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...iStyle, colorScheme: "light" }} />
          </div>
          <div style={{ padding: "0.7rem 0.9rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.14em", color: dim }}>VÉGÖSSZEG</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {discountAmt > 0 && (
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: dim, textDecoration: "line-through" }}>{fmt(base)}</span>
              )}
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.2rem", color: gold, fontWeight: 700 }}>{fmt(finalAmount)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "0.75rem", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: dim, fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em", cursor: "pointer" }}>Mégse</button>
            <button onClick={handleSave} disabled={updateEntry.isPending} className="btn-gold" style={{ flex: 2, padding: "0.75rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em" }}>
              {updateEntry.isPending ? "Mentés…" : "Mentés ✦"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px",
  padding: "0.35rem 0.65rem", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem", outline: "none",
};

type GuestCard = {
  guest: { name: string };
  services: { name: string; price: number; duration: number; gender?: string | null; categoryName?: string | null }[];
  materials: { name: string; brand?: string | null; colorCode?: string | null; grams: number; lineTotal: number }[];
};

type EntryItem = {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  description?: string | null;
  guestCardId?: string | null;
  workDayId?: string | null;
  createdBy?: { id: string; name: string | null } | null;
  guestCard?: GuestCard | null;
  workDay?: {
    user?: { name?: string | null } | null;
    services?: { priceSnap: number; service?: { name?: string | null } | null }[] | null;
  } | null;
};

type VisitGroup = {
  key: string;
  date: string;
  cardId: string | null;
  entries: EntryItem[];
  totalRevenue: number;
  totalMaterial: number;
};

const gBadgeConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  nő:      { label: "Női",    bg: "rgba(232,180,200,0.15)", color: "#e8b4c8", border: "rgba(232,180,200,0.3)" },
  férfi:   { label: "Férfi",  bg: "rgba(122,158,200,0.12)", color: "#7a9ec8", border: "rgba(122,158,200,0.3)" },
  gyermek: { label: "Gyermek",bg: "rgba(124,92,190,0.12)", color: "#7c5cbe", border: "rgba(124,92,190,0.3)" },
};

// ── Single group row ──────────────────────────────────────────────────────────
function VisitGroupRow({
  group, isAdmin, ownerId, canSeeProfit, filterUserId,
  editDateKey, editDateVal,
  onEditDateOpen, onEditDateChange, onEditDateSave, onEditDateCancel, isSavingDate,
  onDelete, onEditCard,
}: {
  group: VisitGroup;
  isAdmin: boolean;
  ownerId: string;
  canSeeProfit: boolean;
  filterUserId?: string;
  editDateKey: string | null;
  editDateVal: string;
  onEditDateOpen: (group: VisitGroup) => void;
  onEditDateChange: (val: string) => void;
  onEditDateSave: () => void;
  onEditDateCancel: () => void;
  isSavingDate: boolean;
  onDelete?: (ids: string[]) => void;
  onEditCard?: (cardId: string) => void;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [standaloneEdit, setStandaloneEdit] = useState(false);

  const revEntry    = group.entries.find(e => e.type === "revenue");
  const card        = (revEntry?.guestCard ?? null) as GuestCard | null;
  const creatorName = revEntry?.createdBy?.name ?? revEntry?.workDay?.user?.name ?? null;
  const creatorId   = revEntry?.createdBy?.id ?? "";
  const isOwner     = creatorId === ownerId;
  const uCol        = filterUserId ? "#527666" : userColor(creatorName);

  const mainLabel = card
    ? card.guest.name
    : (revEntry?.description ?? group.entries[0]?.description ?? "—");

  const serviceNames = card?.services.map(s => s.name) ?? [];
  const matNames     = card?.materials.map(m => m.name) ?? [];

  // Financial summary — default is 60%, configured exception services pay 100%.
  const staffWage = isAdmin && !isOwner ? entriesWageAmount(group.entries) : 0;
  const salonNet  = group.totalRevenue - staffWage;

  const canDelete = !!onDelete && (isAdmin || group.entries.every(e => !e.workDayId));
  const isEditingDate = editDateKey === group.key;

  return (
    <div style={{ background: "var(--bg-panel)", border: `1px solid ${expanded ? uCol + "55" : uCol + "22"}`, borderLeft: `3px solid ${uCol}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>

      {/* ── Collapsed row ── */}
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1rem", cursor: "pointer", transition: "background 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(82,118,102,0.05)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
            {card && <span style={{ color: "#7c5cbe", fontSize: "0.72rem", flexShrink: 0 }}>♦</span>}
            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.02rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
              {mainLabel}
            </span>
          </div>

          {/* Service + material name tags */}
          {(serviceNames.length > 0 || matNames.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {serviceNames.map((name, i) => (
                <span key={i} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: uCol, background: `${uCol}12`, border: `1px solid ${uCol}28`, borderRadius: 4, padding: "0.05rem 0.35rem" }}>
                  {name}
                </span>
              ))}
              {matNames.length > 0 && (
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "#c8a244", background: "rgba(200,162,68,0.08)", border: "1px solid rgba(200,162,68,0.22)", borderRadius: 4, padding: "0.05rem 0.35rem" }}>
                  ✦ festék
                </span>
              )}
            </div>
          )}

          {/* Creator */}
          {creatorName && (
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: uCol, opacity: 0.7, marginTop: "0.15rem", textTransform: "uppercase" }}>
              {creatorName}
            </div>
          )}
        </div>

        {/* Amount */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#527666", fontWeight: 700 }}>
            {fmt(group.totalRevenue + group.totalMaterial)}
          </span>
          {group.totalMaterial > 0 && (
            <span className="entry-amount-sub" style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: "var(--text-soft)", opacity: 0.7 }}>
              munka: {fmt(group.totalRevenue)} + anyag: {fmt(group.totalMaterial)}
            </span>
          )}
          {isAdmin && canSeeProfit && !isOwner && staffWage > 0 && (
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: uCol, opacity: 0.7 }}>
              → {fmt(salonNet)} marad
            </span>
          )}
          {!isAdmin && (
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: "#7c5cbe", fontWeight: 700 }}>
              {fmt(entriesWageAmount(group.entries))} bér
            </span>
          )}
        </div>

        <span style={{ color: "rgba(82,118,102,0.5)", fontSize: "0.65rem", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s", flexShrink: 0 }}>▾</span>

        {/* Admin controls */}
        {isAdmin && (
          <>
            <button onClick={e => {
                e.stopPropagation();
                if (group.cardId && onEditCard) onEditCard(group.cardId);
                else setStandaloneEdit(true);
              }}
              className="entry-action-btn"
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.3rem", borderRadius: 5, flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-teal)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
              title="Bejegyzés szerkesztése">✎</button>
            {standaloneEdit && !group.cardId && (
              <StandaloneEditModal
                entryIds={group.entries.map(e => e.id)}
                initialAmount={group.totalRevenue + group.totalMaterial}
                initialDescription={group.entries[0]?.description ?? ""}
                initialDate={group.date}
                onClose={() => setStandaloneEdit(false)}
              />
            )}
            {canDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete!(group.entries.map(e => e.id)); }}
                className="entry-action-btn"
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem 0.3rem", borderRadius: 5, flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c47878"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLElement).style.background = "none"; }}>✕</button>
            )}
          </>
        )}
      </div>

      {/* ── Date editor ── */}
      {isEditingDate && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 1rem", borderTop: "1px solid rgba(82,118,102,0.1)", background: "rgba(82,118,102,0.04)", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>Új dátum</span>
          <input type="date" value={editDateVal} onChange={e => onEditDateChange(e.target.value)} style={{ ...inputStyle, colorScheme: "light" }} />
          <button onClick={onEditDateSave} disabled={isSavingDate}
            style={{ padding: "0.3rem 0.9rem", borderRadius: 7, border: "1px solid var(--color-teal)", background: "var(--color-teal)", color: "var(--bg-base)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", fontWeight: 700 }}>
            {isSavingDate ? "…" : "Mentés"}
          </button>
          <button onClick={onEditDateCancel}
            style={{ padding: "0.3rem 0.7rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem" }}>
            Mégsem
          </button>
        </div>
      )}

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(82,118,102,0.1)", padding: "0.75rem 1rem 1rem" }}>

          {/* Services */}
          {card && card.services.length > 0 && (
            <div style={{ marginBottom: "0.65rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Elvégzett munkák</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {card.services.map((s, i) => {
                  const badge = s.gender ? gBadgeConfig[s.gender] : null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.65rem", background: `${uCol}0e`, border: `1px solid ${uCol}22`, borderRadius: 7 }}>
                      {badge && (
                        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.1em", padding: "0.1rem 0.35rem", borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                          {badge.label}
                        </span>
                      )}
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: "var(--text-primary)", flex: 1 }}>{s.name}</span>
                      {s.duration > 0 && <span className="entry-svc-duration" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)" }}>⏱ {s.duration} perc</span>}
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: "#527666", fontWeight: 700 }}>{fmt(s.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Materials */}
          {card && card.materials.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", color: "rgba(200,162,68,0.55)", textTransform: "uppercase", marginBottom: "0.4rem" }}>✦ Szín recept</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {card.materials.map((m, i) => (
                  <div key={i} className="entry-mat-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.65rem", background: "rgba(200,162,68,0.06)", border: "1px solid rgba(200,162,68,0.15)", borderRadius: 6 }}>
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                    {m.brand && <span className="entry-mat-meta" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)" }}>{m.brand}</span>}
                    {m.colorCode && <span className="entry-mat-meta" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "#c8a244", fontWeight: 600, letterSpacing: "0.05em" }}>{m.colorCode}</span>}
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-muted)" }}>{m.grams}g</span>
                    <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#a06830", fontWeight: 700 }}>{fmt(m.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No card — standalone entries */}
          {!card && (
            <div style={{ marginBottom: "0.75rem" }}>
              {group.entries.map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-soft)", padding: "0.2rem 0.4rem" }}>
                  <span style={{ fontStyle: "italic" }}>{e.description}</span>
                  <span style={{ color: e.type === "revenue" ? "#527666" : "#a06830", fontWeight: 600 }}>{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Financial summary ── */}
          <div style={{ borderTop: "1px solid rgba(82,118,102,0.15)", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {/* Munkadíj */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0.5rem" }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>◈ Munkadíj (bevétel)</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.92rem", color: "#527666", fontWeight: 700 }}>{fmt(group.totalRevenue)}</span>
            </div>

            {/* Anyagköltség */}
            {group.totalMaterial > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0.5rem" }}>
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>✦ Anyagköltség</span>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: "#a06830", fontWeight: 700 }}>− {fmt(group.totalMaterial)}</span>
              </div>
            )}

            {/* Staff wage deduction — only in admin view, only for non-owner entries */}
            {isAdmin && !isOwner && staffWage > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0.5rem" }}>
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  ♦ {creatorName ?? "Staff"} bére
                </span>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: uCol, fontWeight: 700 }}>− {fmt(staffWage)}</span>
              </div>
            )}

            {/* Net result */}
            {(!isAdmin || canSeeProfit) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.65rem", marginTop: "0.2rem", background: isAdmin ? `${uCol}0d` : "rgba(124,92,190,0.08)", borderRadius: 8, border: `1px solid ${isAdmin ? uCol + "22" : "rgba(124,92,190,0.2)"}` }}>
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: isAdmin ? uCol : "#7c5cbe", textTransform: "uppercase", fontWeight: 700 }}>
                  {isAdmin ? (isOwner ? "● Neked marad" : "● Szalonnak marad") : "● Neked jár"}
                </span>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: isAdmin ? (salonNet >= 0 ? "#527666" : "#c47878") : "#7c5cbe", fontWeight: 700 }}>
                  {isAdmin ? fmt(salonNet) : fmt(entriesWageAmount(group.entries))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff card list (guest-card based, for non-admin finance views) ───────────
type StaffCard = {
  id: string;
  date: string | Date;
  total: number;
  guest: { name: string };
  services: { id: string; name: string; price: number; duration: number; gender?: string | null; categoryName?: string | null }[];
  materials: { id: string; name: string; brand?: string | null; colorCode?: string | null; grams: number; lineTotal: number }[];
};

function StaffCardRow({ card }: { card: StaffCard }) {
  const [open, setOpen] = useState(false);
  const svcTotal  = card.services.reduce((s, x) => s + x.price, 0);
  const myWage    = servicesWageAmount(card.services);
  const dateLabel = new Date(card.date).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "long", day: "numeric", weekday: "long" });

  return (
    <div style={{ background: "var(--bg-panel)", border: `1px solid ${open ? "#7c5cbe55" : "#7c5cbe22"}`, borderLeft: "3px solid #7c5cbe", borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
      {/* Collapsed */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1rem", cursor: "pointer" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,92,190,0.04)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
            <span style={{ color: "#7c5cbe", fontSize: "0.72rem" }}>♦</span>
            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.02rem", color: "var(--text-primary)", fontWeight: 600 }}>
              {card.guest.name}
            </span>
          </div>
          {card.services.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {card.services.map((s, i) => (
                <span key={i} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "#7c5cbe", background: "rgba(124,92,190,0.1)", border: "1px solid rgba(124,92,190,0.22)", borderRadius: 4, padding: "0.05rem 0.35rem" }}>
                  {s.name}
                </span>
              ))}
              {card.materials.length > 0 && (
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "#c8a244", background: "rgba(200,162,68,0.08)", border: "1px solid rgba(200,162,68,0.22)", borderRadius: 4, padding: "0.05rem 0.35rem" }}>
                  ✦ recept
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#527666", fontWeight: 700 }}>{fmt(svcTotal)}</span>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: "#7c5cbe", fontWeight: 700 }}>{fmt(myWage)} bér</span>
        </div>
        <span style={{ color: "rgba(124,92,190,0.5)", fontSize: "0.65rem", transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(124,92,190,0.1)", padding: "0.75rem 1rem 1rem" }}>
          {/* Services */}
          {card.services.length > 0 && (
            <div style={{ marginBottom: "0.65rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", color: "rgba(124,92,190,0.5)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Elvégzett munkák</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {card.services.map((s, i) => {
                  const badge = s.gender ? gBadgeConfig[s.gender] : null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.65rem", background: "rgba(124,92,190,0.06)", border: "1px solid rgba(124,92,190,0.15)", borderRadius: 7 }}>
                      {badge && <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", padding: "0.1rem 0.35rem", borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>{badge.label}</span>}
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: "var(--text-primary)", flex: 1 }}>{s.name}</span>
                      {s.duration > 0 && <span className="entry-svc-duration" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)" }}>⏱ {s.duration} perc</span>}
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: "#527666", fontWeight: 700 }}>{fmt(s.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recipe */}
          {card.materials.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.14em", color: "rgba(200,162,68,0.55)", textTransform: "uppercase", marginBottom: "0.4rem" }}>✦ Szín recept</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {card.materials.map((m, i) => (
                  <div key={i} className="entry-mat-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.65rem", background: "rgba(200,162,68,0.06)", border: "1px solid rgba(200,162,68,0.15)", borderRadius: 6 }}>
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                    {m.brand && <span className="entry-mat-meta" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)" }}>{m.brand}</span>}
                    {m.colorCode && <span className="entry-mat-meta" style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "#c8a244", fontWeight: 600, letterSpacing: "0.05em" }}>{m.colorCode}</span>}
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-muted)" }}>{m.grams}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial summary for staff */}
          <div style={{ borderTop: "1px solid rgba(124,92,190,0.12)", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0.5rem" }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>◈ Munkadíj</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.92rem", color: "#527666", fontWeight: 700 }}>{fmt(svcTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.65rem", marginTop: "0.2rem", background: "rgba(124,92,190,0.08)", borderRadius: 8, border: "1px solid rgba(124,92,190,0.2)" }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: "#7c5cbe", textTransform: "uppercase", fontWeight: 700 }}>● Neked jár</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#7c5cbe", fontWeight: 700 }}>{fmt(myWage)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffCardList({ cards, isLoading, emptyMessage }: {
  cards: StaffCard[];
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) {
    return <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>;
  }
  if (cards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontStyle: "italic" }}>
        {emptyMessage ?? "Nincsenek bejegyzések. ✦"}
      </div>
    );
  }

  // Group by date
  const byDate: Record<string, StaffCard[]> = {};
  cards.forEach(c => {
    const ds = new Date(c.date).toISOString().slice(0, 10);
    (byDate[ds] ??= []).push(c);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {sortedDates.map(ds => {
        const dayCards = byDate[ds]!;
        const dayRev   = dayCards.reduce((s, c) => s + c.services.reduce((ss, sv) => ss + sv.price, 0), 0);
        const dayWage  = dayCards.reduce((s, c) => s + servicesWageAmount(c.services), 0);
        const isToday  = ds === todayStr;
        return (
          <div key={ds}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.16em", color: isToday ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase", flexShrink: 0 }}>
                {isToday ? "Ma — " : ""}{new Date(ds + "T12:00:00").toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
              </div>
              <div style={{ flex: 1, height: 1, background: "var(--bg-active)" }} />
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#527666", fontWeight: 700, flexShrink: 0 }}>{fmt(dayRev)}</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "#7c5cbe", flexShrink: 0 }}>{fmt(dayWage)} bér</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {dayCards.map(card => <StaffCardRow key={card.id} card={card} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Full entry list (date-grouped) ────────────────────────────────────────────
export function EntryList({
  byDate, sortedDates, recentGroups = [], todayStr, isAdmin, ownerId, canSeeProfit = false, filterUserId, isLoading,
  onDelete, onUpdateDate, isSavingDate, emptyMessage, onEditCard,
}: {
  byDate: Record<string, VisitGroup[]>;
  sortedDates: string[];
  recentGroups?: VisitGroup[];
  todayStr: string;
  isAdmin: boolean;
  ownerId: string;
  canSeeProfit?: boolean;
  filterUserId?: string;
  isLoading?: boolean;
  onDelete?: (ids: string[]) => void;
  onUpdateDate?: (entryIds: string[], date: string, cardId?: string) => void;
  isSavingDate?: boolean;
  emptyMessage?: string;
  onEditCard?: (cardId: string) => void;
}) {
  const [editDateKey, setEditDateKey] = useState<string | null>(null);
  const [editDateVal, setEditDateVal] = useState("");

  function handleEditDateOpen(group: VisitGroup) {
    setEditDateVal(new Date(group.entries[0]!.date).toISOString().slice(0, 10));
    setEditDateKey(editDateKey === group.key ? null : group.key);
  }

  if (isLoading) {
    return <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>;
  }

  if (sortedDates.length === 0 && recentGroups.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontStyle: "italic" }}>
        {emptyMessage ?? "Nincsenek bejegyzések. ✦"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Legutóbb mentett 4 */}
      {recentGroups.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.16em", color: "var(--color-teal)", textTransform: "uppercase", flexShrink: 0 }}>
              ✦ Legutóbb mentett
            </div>
            <div style={{ flex: 1, height: 1, background: "var(--bg-active)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {recentGroups.map(group => (
              <VisitGroupRow
                key={group.key}
                group={group}
                isAdmin={isAdmin}
                ownerId={ownerId}
                canSeeProfit={canSeeProfit}
                filterUserId={filterUserId}
                editDateKey={editDateKey}
                editDateVal={editDateVal}
                onEditDateOpen={handleEditDateOpen}
                onEditDateChange={setEditDateVal}
                onEditDateSave={() => {
                  if (!editDateVal) return;
                  onUpdateDate?.(group.entries.map(e => e.id), editDateVal, group.cardId ?? undefined);
                  setEditDateKey(null);
                }}
                onEditDateCancel={() => setEditDateKey(null)}
                isSavingDate={!!isSavingDate}
                onDelete={onDelete}
                onEditCard={onEditCard}
              />
            ))}
          </div>
        </div>
      )}
      {sortedDates.map(ds => {
        const dayGroups = byDate[ds]!;
        const dayRev    = dayGroups.reduce((s, g) => s + g.totalRevenue, 0);
        const dayCost   = dayGroups.reduce((s, g) => s + g.totalMaterial, 0);
        const isToday   = ds === todayStr;

        return (
          <div key={ds}>
            {/* Day header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.16em", color: isToday ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase", flexShrink: 0 }}>
                {isToday ? "Ma — " : ""}{new Date(ds + "T12:00:00").toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
              </div>
              <div style={{ flex: 1, height: 1, background: "var(--bg-active)" }} />
              {dayRev  > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#527666", fontWeight: 700, flexShrink: 0 }}>{fmt(dayRev)}</span>}
              {dayCost > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "#a06830", flexShrink: 0 }}>−{fmt(dayCost)}</span>}
            </div>

            {/* Groups */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {dayGroups.map(group => (
                <VisitGroupRow
                  key={group.key}
                  group={group}
                  isAdmin={isAdmin}
                  ownerId={ownerId}
                  canSeeProfit={canSeeProfit}
                  filterUserId={filterUserId}
                  editDateKey={editDateKey}
                  editDateVal={editDateVal}
                  onEditDateOpen={handleEditDateOpen}
                  onEditDateChange={setEditDateVal}
                  onEditDateSave={() => {
                    if (onUpdateDate) onUpdateDate(group.entries.map(e => e.id), editDateVal, group.cardId ?? undefined);
                  }}
                  onEditDateCancel={() => setEditDateKey(null)}
                  isSavingDate={!!isSavingDate}
                  onDelete={onDelete}
                  onEditCard={onEditCard}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
