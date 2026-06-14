"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { userColor, buildVisitGroups } from "../_client";
import { EntryList } from "../_entry-list";

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

  const STAFF_RATE   = 0.6;
  const todayStr     = toDateStr(now);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const utils = api.useUtils();
  const inv = () => { void utils.finance.list.invalidate(); void utils.calendar.month.invalidate(); };

  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const activeFilter = !isAdmin ? userId : filterUserId;
  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month, filterUserId: activeFilter });
  const del        = api.finance.delete.useMutation({ onSuccess: inv });
  const updateDate = api.finance.updateDate.useMutation({ onSuccess: inv });

  const revenue  = entries.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = entries.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage     = entries.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - material - wage;
  const staffNet = Math.round(revenue * STAFF_RATE);


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

  const visibleEntries = isAdmin ? entries : entries.filter(e => e.type === "revenue" || e.type === "material" || e.type === "wage");
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
        <StatBox label={MONTHS[month-1] ?? ""} value={revenue} color="#527666" sub="bevétel" large />
        {isAdmin ? <>
          <StatBox label="Anyagköltség" value={material} color="#a06830" sub="kiadás" />
          <StatBox label={wage > 0 ? "Bérek" : "Várható bér (60%)"} value={wage > 0 ? wage : Math.round(revenue * STAFF_RATE)} color="#7256a0" sub={wage > 0 ? "kiadás" : "becslés"} />
          <StatBox label="Nyereség"     value={profit}   color={profit >= 0 ? "#527666" : "#c47878"} sub={revenue > 0 ? `${Math.round((profit/revenue)*100)}% árrés` : ""} large />
        </> : <>
          <StatBox label={wage > 0 ? "Béred" : "Neked jár (60%)"} value={wage > 0 ? wage : staffNet} color="#a78bfa" sub="havi bér" large />
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

      <EntryList
        byDate={byDate}
        sortedDates={sortedDates}
        todayStr={todayStr}
        isAdmin={isAdmin}
        ownerId={userId}
        filterUserId={filterUserId}
        isLoading={isLoading}
        onDelete={(ids) => ids.forEach(id => del.mutate({ id }))}
        onUpdateDate={(ids, date, cardId) => updateDate.mutate({ entryIds: ids, date, guestCardId: cardId })}
        isSavingDate={updateDate.isPending}
        emptyMessage="Ebben a hónapban még nincsenek tételek. ✦"
      />
    </div>
  );
}
