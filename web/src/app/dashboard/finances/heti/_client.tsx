"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { buildVisitGroups, userColor } from "../_client";
import { EntryList } from "../_entry-list";

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

const navBtn: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
  color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function StatBox({ label, value, color, sub, large }: { label: string; value: number; color: string; sub?: string; large?: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid ${color}33`, borderRadius: 14, padding: large ? "1.25rem 1.5rem" : "1rem 1.25rem", flex: large ? "1 1 180px" : "1 1 130px", minWidth: large ? 160 : 110 }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: `${color}99`, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-playfair)", fontSize: large ? "1.45rem" : "1.15rem", color, fontWeight: 700, lineHeight: 1 }}>{fmt(value)}</div>
      {sub && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", marginTop: "0.25rem", fontStyle: "italic" }}>{sub}</div>}
    </div>
  );
}

export default function HetiClient({ isAdmin = true, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined);

  const refDay = new Date(now);
  refDay.setDate(now.getDate() + weekOffset * 7);
  const { mon, sun } = weekBounds(refDay);
  const year    = mon.getFullYear();
  const month   = mon.getMonth() + 1;
  const STAFF_RATE = 0.6;

  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const activeFilter = !isAdmin ? userId : filterUserId;

  const { data: monthEntries = [], isLoading } = api.finance.list.useQuery({ year, month, filterUserId: activeFilter });

  const month2     = sun.getMonth() + 1;
  const year2      = sun.getFullYear();
  const needSecond = month2 !== month || year2 !== year;
  const { data: monthEntries2 = [] } = api.finance.list.useQuery(
    { year: year2, month: month2, filterUserId: activeFilter },
    { enabled: needSecond }
  );

  // Unfiltered — for per-worker breakdown
  const { data: allMonth1 = [] } = api.finance.list.useQuery({ year, month }, { enabled: isAdmin });
  const { data: allMonth2 = [] } = api.finance.list.useQuery({ year: year2, month: month2 }, { enabled: isAdmin && needSecond });

  const inWeek         = (e: { date: string | Date }) => { const d = new Date(e.date); return d >= mon && d <= sun; };
  const allEntries     = needSecond ? [...monthEntries, ...monthEntries2] : monthEntries;
  const allUnfiltered  = (needSecond ? [...allMonth1, ...allMonth2] : allMonth1).filter(inWeek);

  const weekEntries = allEntries.filter(inWeek);
  const visible     = isAdmin ? weekEntries : weekEntries.filter(e => e.type === "revenue" || e.type === "material" || e.type === "wage");
  const revenue     = visible.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material    = visible.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage        = visible.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);

  function entryOwner(e: { createdBy?: { id: string } | null; workDay?: { user?: { id: string } | null } | null }) {
    return e.workDay?.user?.id ?? e.createdBy?.id ?? "";
  }
  const workerStats = allUsers
    .map(u => {
      const rev   = allUnfiltered.filter(e => e.type === "revenue" && entryOwner(e) === u.id).reduce((s, e) => s + e.amount, 0);
      const wages = allUnfiltered.filter(e => e.type === "wage"    && entryOwner(e) === u.id).reduce((s, e) => s + e.amount, 0);
      return { id: u.id, name: u.name ?? "?", revenue: rev, wages, earn: wages > 0 ? wages : Math.round(rev * STAFF_RATE) };
    })
    .filter(w => w.revenue > 0 || w.wages > 0);

  const isOwnView = filterUserId === userId;
  const staffWageTotal = workerStats.filter(w => w.id !== userId).reduce((s, w) => s + w.earn, 0);
  const profit = revenue - material;

  const { byDate, sortedDates } = buildVisitGroups(visible);
  const todayStr = toDateStr(now);

  const monLabel = mon.toLocaleDateString("hu-HU", { month: "long", day: "numeric" });
  const sunLabel = sun.toLocaleDateString("hu-HU", { month: "long", day: "numeric" });
  const isThisWeek = weekOffset === 0;

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Heti kimutatás ✦</h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", margin: "0.3rem 0 0" }}>
            {filterUserId ? `${allUsers.find(u => u.id === filterUserId)?.name ?? "?"} heti adatai` : "Egy hét bevételei és kiadásai"}
          </p>
        </div>
        {isAdmin && allUsers.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button onClick={() => setFilterUserId(undefined)}
              style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: !filterUserId ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: !filterUserId ? "var(--bg-active)" : "transparent", color: !filterUserId ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}>
              Mindenki
            </button>
            {allUsers.map(u => {
              const uc = userColor(u.name);
              const sel = filterUserId === u.id;
              return (
                <button key={u.id} onClick={() => setFilterUserId(sel ? undefined : u.id)}
                  style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: sel ? `1px solid ${uc}88` : "1px solid var(--border)", background: sel ? `${uc}18` : "transparent", color: sel ? uc : "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }}>
                  {u.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Week navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={navBtn}>‹</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.12em", color: "var(--color-teal)" }}>
            {isThisWeek ? "Ez a hét — " : ""}{monLabel} – {sunLabel}
          </div>
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)} style={navBtn}>›</button>
        {!isThisWeek && (
          <button onClick={() => setWeekOffset(0)}
            style={{ padding: "0.3rem 0.75rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", cursor: "pointer" }}>
            E hét
          </button>
        )}
      </div>

      {/* Stat boxes */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: (!filterUserId && workerStats.length > 0) ? "0.75rem" : "2rem" }}>
        <StatBox label="Heti bevétel" value={revenue} color="#527666" sub={`${monLabel} – ${sunLabel}`} large />
        {isAdmin && material > 0 && <StatBox label="Anyagköltség" value={material} color="#a06830" sub="kiadás" />}
        {isAdmin && !isOwnView && revenue > 0 && <StatBox label={wage > 0 ? "Bérek" : "Várható bér (60%)"} value={staffWageTotal > 0 ? staffWageTotal : Math.round(revenue * STAFF_RATE)} color="#7256a0" sub={wage > 0 ? "kiadás" : "becslés"} />}
        {isAdmin && revenue > 0 && <StatBox label="Profit" value={profit} color={profit >= 0 ? "#527666" : "#c47878"} sub={revenue > 0 ? `${Math.round((profit/revenue)*100)}%` : ""} large />}
        {!isAdmin && (wage > 0 || revenue > 0) && <StatBox label={wage > 0 ? "Béred" : "Neked jár (60%)"} value={wage > 0 ? wage : Math.round(revenue * STAFF_RATE)} color="#a78bfa" sub="heti bér" large />}
      </div>

      {/* Per-worker earnings */}
      {isAdmin && !filterUserId && workerStats.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(114,86,160,0.55)", marginBottom: "0.55rem" }}>♦ Bérek</div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {workerStats.map(w => {
              const colors: Record<string, string> = { Gitta: "#9878b8", Lili: "#e8a0b8", Felicia: "#c9906a" };
              const uc = colors[w.name] ?? "#7256a0";
              return (
                <div key={w.id} style={{ background: "var(--bg-card)", border: `1px solid ${uc}33`, borderRadius: 14, padding: "0.85rem 1.25rem", flex: "1 1 140px", minWidth: 130 }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", color: `${uc}99`, marginBottom: "0.35rem" }}>{w.name}</div>
                  <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: uc, fontWeight: 700, lineHeight: 1 }}>{fmt(w.earn)}</div>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", marginTop: "0.25rem", fontStyle: "italic" }}>
                    {w.wages > 0 ? "rögzített bér" : `bevétel: ${fmt(w.revenue)}`}
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
        isLoading={isLoading}
        emptyMessage="Ebben a hétben még nincsenek bejegyzések. ✦"
      />
    </div>
  );
}
