"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { buildVisitGroups } from "../_client";
import { EntryList } from "../_entry-list";

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

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

export default function NapiClient({ isAdmin = true, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const [date, setDate] = useState(() => toDateStr(now));

  const d       = new Date(date + "T12:00:00");
  const year    = d.getFullYear();
  const month   = d.getMonth() + 1;
  const STAFF_RATE = 0.6;

  const { data: entries = [], isLoading } = api.finance.list.useQuery({
    year, month,
    filterUserId: !isAdmin ? userId : undefined,
  });

  const dayEntries = entries.filter(e => toDateStr(new Date(e.date)) === date);
  const visible    = isAdmin ? dayEntries : dayEntries.filter(e => e.type === "revenue" || e.type === "material");

  const revenue  = visible.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = visible.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage     = visible.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - material - wage;

  const { byDate, sortedDates } = buildVisitGroups(visible);
  const todayStr = toDateStr(now);

  function prevDay() {
    const d2 = new Date(date + "T12:00:00"); d2.setDate(d2.getDate() - 1); setDate(toDateStr(d2));
  }
  function nextDay() {
    const d2 = new Date(date + "T12:00:00"); d2.setDate(d2.getDate() + 1); setDate(toDateStr(d2));
  }
  const isToday = date === toDateStr(now);
  const dayLabel = d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Napi kimutatás ✦</h1>
        <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", margin: "0.3rem 0 0" }}>Egy nap bevételei és kiadásai</p>
      </div>

      {/* Day navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={prevDay} style={navBtn}>‹</button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 200 }}>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.12em", color: "var(--color-teal)" }}>
            {isToday ? "Ma — " : ""}{dayLabel}
          </span>
        </div>
        <button onClick={nextDay} style={navBtn}>›</button>
        {!isToday && (
          <button onClick={() => setDate(toDateStr(now))}
            style={{ padding: "0.3rem 0.75rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", cursor: "pointer" }}>
            Ma
          </button>
        )}
      </div>

      {/* Stat boxes */}
      {(revenue > 0 || isAdmin) && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <StatBox label="Bevétel" value={revenue} color="#527666" sub={d.toLocaleDateString("hu-HU", { month: "long", day: "numeric" })} large />
          {isAdmin && material > 0 && <StatBox label="Anyagköltség" value={material} color="#a06830" sub="kiadás" />}
          {isAdmin && wage > 0     && <StatBox label="Bérek"        value={wage}     color="#7256a0" sub="kiadás" />}
          {isAdmin && revenue > 0  && <StatBox label="Profit"       value={profit}   color={profit >= 0 ? "#527666" : "#c47878"} sub={revenue > 0 ? `${Math.round((profit/revenue)*100)}%` : ""} large />}
          {!isAdmin && revenue > 0 && <StatBox label="Neked jár (60%)" value={Math.round(revenue * STAFF_RATE)} color="#a78bfa" sub="ma" large />}
        </div>
      )}

      <EntryList
        byDate={byDate}
        sortedDates={sortedDates}
        todayStr={todayStr}
        isAdmin={isAdmin}
        ownerId={userId}
        isLoading={isLoading}
        emptyMessage="Ezen a napon még nincsenek bejegyzések. ✦"
      />
    </div>
  );
}
