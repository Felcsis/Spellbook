"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { userColor, buildVisitGroups } from "../_client";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
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
  fontFamily: "var(--font-cormorant)", fontSize: "1rem", outline: "none", width: "100%",
};
const navBtn: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
  color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function StatBox({ label, value, color, sub, large }: { label: string; value: number; color: string; sub?: string; large?: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid ${color}33`, borderRadius: 14, padding: large ? "1.25rem 1.5rem" : "1rem 1.25rem", flex: large ? "1 1 180px" : "1 1 130px", minWidth: large ? 160 : 110, transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${color}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: `${color}99`, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-playfair)", fontSize: large ? "1.45rem" : "1.15rem", color, fontWeight: 700, lineHeight: 1 }}>{fmt(value)}</div>
      {sub && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", marginTop: "0.25rem", fontStyle: "italic" }}>{sub}</div>}
    </div>
  );
}

export default function HaviClient({ isAdmin = true, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const [year,         setYear]         = useState(now.getFullYear());
  const [month,        setMonth]        = useState(now.getMonth() + 1);
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [editDateKey,  setEditDateKey]  = useState<string | null>(null);
  const [editDateVal,  setEditDateVal]  = useState("");

  const STAFF_RATE   = 0.6;
  const todayStr     = toDateStr(now);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const utils = api.useUtils();
  const inv = () => { void utils.finance.list.invalidate(); void utils.calendar.month.invalidate(); };

  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month, filterUserId });
  const del        = api.finance.delete.useMutation({ onSuccess: inv });
  const updateDate = api.finance.updateDate.useMutation({ onSuccess: () => { inv(); setEditDateKey(null); } });

  const revenue  = entries.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = entries.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage     = entries.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - material - wage;
  const staffNet = Math.round(revenue * STAFF_RATE);

  const { mon: weekMon, sun: weekSun } = weekBounds(now);
  const todayRevenue = entries.filter(e => e.type === "revenue" && toDateStr(new Date(e.date)) === todayStr).reduce((s, e) => s + e.amount, 0);
  const weekRevenue  = entries.filter(e => { const d = new Date(e.date); return e.type === "revenue" && d >= weekMon && d <= weekSun; }).reduce((s, e) => s + e.amount, 0);

  // Per-staff breakdown
  type StaffStat = { name: string; isOwner: boolean; revenue: number; material: number; wage: number };
  const staffStats: Record<string, StaffStat> = {};
  if (isAdmin) {
    entries.forEach(e => {
      const by = e.createdBy as { id: string; name: string } | undefined;
      const name = by?.name ?? "?";
      const isOwner = by?.id === userId;
      if (!staffStats[name]) staffStats[name] = { name, isOwner, revenue: 0, material: 0, wage: 0 };
      if (e.type === "revenue")  staffStats[name]!.revenue  += e.amount;
      if (e.type === "material") staffStats[name]!.material += e.amount;
      if (e.type === "wage")     staffStats[name]!.wage     += e.amount;
    });
  }

  const visibleEntries = isAdmin ? entries : entries.filter(e => e.type === "revenue" || e.type === "material");
  const { byDate, sortedDates } = buildVisitGroups(visibleEntries);

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Havi kimutatás ✦</h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", margin: "0.3rem 0 0" }}>
            {filterUserId ? `${allUsers.find(u => u.id === filterUserId)?.name ?? "?"} havi adatai` : "Bevételek, kiadások és nyereség"}
          </p>
        </div>
        {isAdmin && allUsers.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button onClick={() => setFilterUserId(undefined)}
              style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: !filterUserId ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: !filterUserId ? "var(--bg-active)" : "transparent", color: !filterUserId ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}>
              Mindenki
            </button>
            {allUsers.map(u => (
              <button key={u.id} onClick={() => setFilterUserId(filterUserId === u.id ? undefined : u.id)}
                style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: filterUserId === u.id ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: filterUserId === u.id ? "var(--bg-active)" : "transparent", color: filterUserId === u.id ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }}>
                {u.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--color-teal)", flex: 1, textAlign: "center" }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* Stat boxes */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
        {isCurrentMonth && <>
          <StatBox label="Ma" value={todayRevenue} color="#527666" sub="bevétel" />
          <StatBox label="Ez a hét" value={weekRevenue} color="#527666" sub="bevétel" />
        </>}
        <StatBox label={isCurrentMonth ? "Ez a hónap" : (MONTHS[month-1] ?? "")} value={revenue} color="#527666" sub="bevétel" large={!isCurrentMonth} />
        {isAdmin ? <>
          <StatBox label="Anyagköltség" value={material} color="#a06830" sub="kiadás" />
          <StatBox label="Bérek"        value={wage}     color="#7256a0" sub="kiadás" />
          <StatBox label="Nyereség"     value={profit}   color={profit >= 0 ? "#527666" : "#c47878"} sub={revenue > 0 ? `${Math.round((profit/revenue)*100)}% árrés` : ""} large />
        </> : <>
          <StatBox label="Neked jár (60%)" value={staffNet} color="#a78bfa" sub="havi bér" large />
          {isCurrentMonth && todayRevenue > 0 && <StatBox label="Mai bér"  value={Math.round(todayRevenue * STAFF_RATE)} color="#a78bfa" sub="60%" />}
          {isCurrentMonth && weekRevenue  > 0 && <StatBox label="Heti bér" value={Math.round(weekRevenue  * STAFF_RATE)} color="#a78bfa" sub="60%" />}
        </>}
      </div>

      {/* Per-staff breakdown */}
      {isAdmin && !filterUserId && Object.keys(staffStats).length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "0.75rem" }}>◈ Személyenkénti bontás</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Object.values(staffStats).sort((a, b) => b.revenue - a.revenue).map(st => {
              const staffWage = st.isOwner ? 0 : Math.round(st.revenue * STAFF_RATE);
              const myProfit  = st.revenue - staffWage;
              const uC        = userColor(st.name);
              return (
                <div key={st.name} style={{ background: "var(--bg-panel)", border: `1px solid ${uC}22`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 1rem", background: `${uC}10`, borderBottom: `1px solid ${uC}22` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: uC, boxShadow: `0 0 6px ${uC}88` }} />
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", color: uC, fontWeight: 700 }}>{st.name}</div>
                    {st.isOwner && <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.42rem", color: uC, opacity: 0.6, textTransform: "uppercase" }}>tulajdonos</div>}
                  </div>
                  <div style={{ padding: "0.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0" }}>
                      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>◈ Bevétel</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: "#527666", fontWeight: 700 }}>{fmt(st.revenue)}</span>
                    </div>
                    {st.material > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>✦ Anyagköltség</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: "#a06830", fontWeight: 700 }}>{fmt(st.material)}</span>
                      </div>
                    )}
                    {!st.isOwner && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>♦ {st.name} bére (60%)</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: uC, fontWeight: 700 }}>− {fmt(staffWage)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0.65rem", marginTop: "0.2rem", background: `${uC}0d`, borderRadius: 8, border: `1px solid ${uC}22` }}>
                      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: uC, textTransform: "uppercase", fontWeight: 700 }}>
                        {st.isOwner ? "● Neked marad" : "● Szalonnak marad"}
                      </span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: myProfit >= 0 ? "#527666" : "#c47878", fontWeight: 700 }}>{fmt(myProfit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entry list */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontStyle: "italic", fontFamily: "var(--font-cormorant)", padding: "3rem" }}>Betöltés...</div>
      ) : sortedDates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-soft)", fontStyle: "italic", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>
          Ebben a hónapban még nincsenek tételek. ✦
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {sortedDates.map(ds => {
            const dayGroups = byDate[ds]!;
            const dayRev  = dayGroups.reduce((s, g) => s + g.totalRevenue, 0);
            const dayCost = dayGroups.reduce((s, g) => s + g.totalMaterial, 0);
            const isToday = ds === todayStr;
            return (
              <div key={ds}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.18em", color: isToday ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase" }}>
                    {isToday ? "Ma — " : ""}{new Date(ds + "T12:00:00").toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "var(--bg-active)" }} />
                  {dayRev > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#527666", fontWeight: 700 }}>{fmt(dayRev)}</span>}
                  {dayCost > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "#a06830" }}>−{fmt(dayCost)}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {dayGroups.map(group => {
                    const revEntry    = group.entries.find(e => e.type === "revenue");
                    const card        = revEntry ? (revEntry as { guestCard?: { guest: { name: string }; services: { name: string; price: number; duration: number; gender?: string | null; categoryName?: string | null }[]; materials: { name: string; brand?: string | null; colorCode?: string | null; grams: number; lineTotal: number }[] } }).guestCard : undefined;
                    const isExpanded  = expandedId === group.key;
                    const creatorName = revEntry?.createdBy?.name ?? (revEntry as { workDay?: { user?: { name?: string | null } | null } | null } | null)?.workDay?.user?.name;
                    const uCol        = !filterUserId ? userColor(creatorName) : "#527666";
                    const hasMultiple = group.entries.length > 1 || (card && (card.services.length > 1 || card.materials.length > 0));
                    const canDelete   = group.entries.every(e => !(e as { workDayId?: string | null }).workDayId);
                    return (
                      <div key={group.key} style={{ background: "var(--bg-panel)", border: `1px solid ${isExpanded ? uCol + "55" : uCol + "22"}`, borderLeft: `3px solid ${uCol}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                        <div onClick={() => setExpandedId(isExpanded ? null : group.key)}
                          style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.75rem 1.1rem", cursor: "pointer" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(82,118,102,0.06)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <span style={{ color: "#527666", fontSize: "0.85rem", opacity: 0.7 }}>◈</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {card && <span style={{ color: "#a78bfa", marginRight: "0.4rem", fontSize: "0.75rem" }}>♦</span>}
                              {card ? card.guest.name : (revEntry?.description ?? group.entries[0]!.description)}
                            </div>
                            {creatorName && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: uCol, fontStyle: "italic", fontWeight: 600 }}>{creatorName}</div>}
                          </div>
                          {isAdmin ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" }}>
                              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#527666", fontWeight: 700 }}>{fmt(group.totalRevenue)}</span>
                              {group.totalMaterial > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: "#a06830" }}>−{fmt(group.totalMaterial)} anyag</span>}
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" }}>
                              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmt(group.totalRevenue)}</span>
                              {group.totalMaterial > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "#a06830" }}>−{fmt(group.totalMaterial)} anyag</span>}
                              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: uCol, fontWeight: 700 }}>{fmt(Math.round(group.totalRevenue * STAFF_RATE))} neked</span>
                            </div>
                          )}
                          {hasMultiple && <span style={{ color: "rgba(82,118,102,0.5)", fontSize: "0.65rem", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>}
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); setEditDateVal(new Date(group.entries[0]!.date).toISOString().slice(0,10)); setEditDateKey(editDateKey === group.key ? null : group.key); }}
                              style={{ background: "none", border: "none", color: editDateKey === group.key ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.35rem", borderRadius: 5, flexShrink: 0 }}
                              title="Dátum szerkesztése">✎</button>
                          )}
                          {isAdmin && canDelete && (
                            <button onClick={e => { e.stopPropagation(); group.entries.forEach(en => del.mutate({ id: en.id })); }}
                              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem 0.35rem", borderRadius: 5, flexShrink: 0 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c47878"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLElement).style.background = "none"; }}>✕</button>
                          )}
                        </div>
                        {editDateKey === group.key && (
                          <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 1.1rem", borderTop: "1px solid rgba(82,118,102,0.12)", background: "rgba(82,118,102,0.04)" }}>
                            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>Új dátum</span>
                            <input type="date" value={editDateVal} onChange={e => setEditDateVal(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "0.3rem 0.65rem", fontSize: "0.9rem", colorScheme: "light" }} />
                            <button onClick={() => updateDate.mutate({ entryIds: group.entries.map(e => e.id), date: editDateVal, guestCardId: group.cardId ?? undefined })} disabled={updateDate.isPending}
                              style={{ padding: "0.3rem 0.9rem", borderRadius: 7, border: "1px solid var(--color-teal)", background: "var(--color-teal)", color: "var(--bg-base)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", fontWeight: 700 }}>
                              {updateDate.isPending ? "…" : "Mentés"}
                            </button>
                            <button onClick={() => setEditDateKey(null)} style={{ padding: "0.3rem 0.7rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem" }}>Mégsem</button>
                          </div>
                        )}
                        {isExpanded && card && (
                          <div style={{ padding: "0 1.1rem 0.9rem 2.5rem", borderTop: "1px solid rgba(82,118,102,0.1)" }}>
                            {card.services.length > 0 && (
                              <div style={{ marginTop: "0.65rem" }}>
                                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.16em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "0.35rem" }}>Elvégzett szolgáltatások</div>
                                {card.services.map((s, i) => {
                                  const gBadge = s.gender === "nő" ? { label: "Női", bg: "rgba(232,180,200,0.15)", color: "#e8b4c8", border: "rgba(232,180,200,0.3)" }
                                    : s.gender === "férfi" ? { label: "Férfi", bg: "rgba(122,158,200,0.12)", color: "#7a9ec8", border: "rgba(122,158,200,0.3)" }
                                    : s.gender === "gyermek" ? { label: "Gyermek", bg: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "rgba(167,139,250,0.3)" }
                                    : null;
                                  return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.65rem", background: "rgba(82,118,102,0.08)", border: "1px solid rgba(82,118,102,0.15)", borderRadius: 7, flexWrap: "wrap", marginBottom: "0.25rem" }}>
                                      {gBadge && <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", padding: "0.12rem 0.4rem", borderRadius: 4, background: gBadge.bg, color: gBadge.color, border: `1px solid ${gBadge.border}` }}>{gBadge.label}</span>}
                                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "#527666", flex: 1 }}>{s.name}{s.categoryName ? ` · ${s.categoryName}` : ""}</span>
                                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: "rgba(82,118,102,0.7)", fontWeight: 700 }}>{fmt(s.price)}</span>
                                      {s.duration > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "var(--text-soft)" }}>⏱ {s.duration} perc</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {card.materials.length > 0 && (
                              <div style={{ marginTop: "0.65rem" }}>
                                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.16em", color: "rgba(200,162,68,0.5)", textTransform: "uppercase", marginBottom: "0.35rem" }}>✦ Anyagköltség: {fmt(group.totalMaterial)}</div>
                                {card.materials.map((m, i) => (
                                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", padding: "0.2rem 0.65rem", background: "rgba(200,162,68,0.05)", borderRadius: 6 }}>
                                    <span style={{ color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                                    {m.brand && <span style={{ color: "var(--text-soft)", fontSize: "0.82rem" }}>{m.brand}</span>}
                                    {m.colorCode && <span style={{ color: "#c8a244", fontWeight: 600, fontSize: "0.82rem" }}>{m.colorCode}</span>}
                                    <span style={{ color: "var(--text-muted)" }}>{m.grams}g</span>
                                    <span style={{ color: "#a06830", fontWeight: 700, fontSize: "0.82rem" }}>{fmt(m.lineTotal)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
