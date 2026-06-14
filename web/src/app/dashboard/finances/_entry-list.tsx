"use client";

import { useState } from "react";
import { userColor } from "./_client";

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
  workDay?: { user?: { name?: string | null } | null } | null;
};

type VisitGroup = {
  key: string;
  date: string;
  cardId: string | null;
  entries: EntryItem[];
  totalRevenue: number;
  totalMaterial: number;
};

const STAFF_RATE = 0.6;

const gBadgeConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  nő:      { label: "Női",    bg: "rgba(232,180,200,0.15)", color: "#e8b4c8", border: "rgba(232,180,200,0.3)" },
  férfi:   { label: "Férfi",  bg: "rgba(122,158,200,0.12)", color: "#7a9ec8", border: "rgba(122,158,200,0.3)" },
  gyermek: { label: "Gyermek",bg: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "rgba(167,139,250,0.3)" },
};

// ── Single group row ──────────────────────────────────────────────────────────
function VisitGroupRow({
  group, isAdmin, ownerId, filterUserId,
  editDateKey, editDateVal,
  onEditDateOpen, onEditDateChange, onEditDateSave, onEditDateCancel, isSavingDate,
  onDelete,
}: {
  group: VisitGroup;
  isAdmin: boolean;
  ownerId: string;
  filterUserId?: string;
  editDateKey: string | null;
  editDateVal: string;
  onEditDateOpen: (group: VisitGroup) => void;
  onEditDateChange: (val: string) => void;
  onEditDateSave: () => void;
  onEditDateCancel: () => void;
  isSavingDate: boolean;
  onDelete?: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

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

  // Financial summary — 60/40 split is on gross revenue, materials are Felicia's own cost
  const staffWage = isAdmin && !isOwner ? Math.round(group.totalRevenue * STAFF_RATE) : 0;
  const salonNet  = group.totalRevenue - staffWage;

  const canDelete = !!onDelete && group.entries.every(e => !e.workDayId);
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
            {card && <span style={{ color: "#a78bfa", fontSize: "0.72rem", flexShrink: 0 }}>♦</span>}
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
            {fmt(group.totalRevenue)}
          </span>
          {isAdmin && !isOwner && staffWage > 0 && (
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: uCol, opacity: 0.7 }}>
              → {fmt(salonNet)} marad
            </span>
          )}
          {!isAdmin && (
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: "#a78bfa", fontWeight: 700 }}>
              {fmt(Math.round(group.totalRevenue * STAFF_RATE))} bér
            </span>
          )}
        </div>

        <span style={{ color: "rgba(82,118,102,0.5)", fontSize: "0.65rem", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s", flexShrink: 0 }}>▾</span>

        {/* Admin controls */}
        {isAdmin && (
          <>
            <button onClick={e => { e.stopPropagation(); onEditDateOpen(group); }}
              style={{ background: "none", border: "none", color: isEditingDate ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.3rem", borderRadius: 5, flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-teal)"; }}
              onMouseLeave={e => { if (!isEditingDate) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
              title="Dátum szerkesztése">✎</button>
            {canDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete!(group.entries.map(e => e.id)); }}
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
                      {s.duration > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)" }}>⏱ {s.duration} perc</span>}
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
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.65rem", background: "rgba(200,162,68,0.06)", border: "1px solid rgba(200,162,68,0.15)", borderRadius: 6 }}>
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                    {m.brand && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)" }}>{m.brand}</span>}
                    {m.colorCode && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "#c8a244", fontWeight: 600, letterSpacing: "0.05em" }}>{m.colorCode}</span>}
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
                  ♦ {creatorName ?? "Staff"} bére (60%)
                </span>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: uCol, fontWeight: 700 }}>− {fmt(staffWage)}</span>
              </div>
            )}

            {/* Net result */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.65rem", marginTop: "0.2rem", background: isAdmin ? `${uCol}0d` : "rgba(167,139,250,0.08)", borderRadius: 8, border: `1px solid ${isAdmin ? uCol + "22" : "rgba(167,139,250,0.2)"}` }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: isAdmin ? uCol : "#a78bfa", textTransform: "uppercase", fontWeight: 700 }}>
                {isAdmin ? (isOwner ? "● Neked marad" : "● Szalonnak marad (40%)") : "● Neked jár (60%)"}
              </span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: isAdmin ? (salonNet >= 0 ? "#527666" : "#c47878") : "#a78bfa", fontWeight: 700 }}>
                {isAdmin ? fmt(salonNet) : fmt(Math.round(group.totalRevenue * STAFF_RATE))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full entry list (date-grouped) ────────────────────────────────────────────
export function EntryList({
  byDate, sortedDates, todayStr, isAdmin, ownerId, filterUserId, isLoading,
  onDelete, onUpdateDate, isSavingDate, emptyMessage,
}: {
  byDate: Record<string, VisitGroup[]>;
  sortedDates: string[];
  todayStr: string;
  isAdmin: boolean;
  ownerId: string;
  filterUserId?: string;
  isLoading?: boolean;
  onDelete?: (ids: string[]) => void;
  onUpdateDate?: (entryIds: string[], date: string, cardId?: string) => void;
  isSavingDate?: boolean;
  emptyMessage?: string;
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

  if (sortedDates.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontStyle: "italic" }}>
        {emptyMessage ?? "Nincsenek bejegyzések. ✦"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
