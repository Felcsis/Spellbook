"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

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

export default function EvesClient({ isAdmin = true, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const router = useRouter();
  const [year,         setYear]         = useState(now.getFullYear());
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined);

  const STAFF_RATE = 0.6;

  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const { data: yearData = [], isLoading } = api.finance.yearSummary.useQuery({ year, filterUserId });

  const yearRev    = yearData.reduce((s, m) => s + m.revenue, 0);
  const yearMat    = yearData.reduce((s, m) => s + m.material, 0);
  const yearWage   = yearData.reduce((s, m) => s + m.wage, 0);
  const yearProfit = yearRev - yearMat - yearWage;
  const maxRev     = Math.max(...yearData.map(m => m.revenue), 1);

  function goToMonth(month: number) {
    router.push(`/dashboard/finances/havi?year=${year}&month=${month}`);
  }

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Éves kimutatás ✦</h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", margin: "0.3rem 0 0" }}>
            {year}. évi összefoglaló
          </p>
        </div>
        {isAdmin && allUsers.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button onClick={() => setFilterUserId(undefined)}
              style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: !filterUserId ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: !filterUserId ? "var(--bg-active)" : "transparent", color: !filterUserId ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em", cursor: "pointer" }}>
              Mindenki
            </button>
            {allUsers.map(u => (
              <button key={u.id} onClick={() => setFilterUserId(filterUserId === u.id ? undefined : u.id)}
                style={{ padding: "0.38rem 0.8rem", borderRadius: 8, border: filterUserId === u.id ? "1px solid var(--border-strong)" : "1px solid var(--border)", background: filterUserId === u.id ? "var(--bg-active)" : "transparent", color: filterUserId === u.id ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", cursor: "pointer" }}>
                {u.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Year navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => setYear(y => y - 1)} style={navBtn}>‹</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--color-teal)", flex: 1, textAlign: "center" }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={navBtn}>›</button>
      </div>

      {/* Year totals */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatBox label={`${year} bevétel`} value={yearRev}    color="#527666" sub="összesen" large />
        {isAdmin && <StatBox label="Anyagköltség" value={yearMat}    color="#a06830" sub="összesen" />}
        {isAdmin && <StatBox label="Bérek"        value={yearWage}   color="#7256a0" sub="összesen" />}
        {isAdmin && <StatBox label="Nyereség"     value={yearProfit} color={yearProfit >= 0 ? "#527666" : "#c47878"} sub={yearRev > 0 ? `${Math.round((yearProfit/yearRev)*100)}% árrés` : ""} large />}
        {!isAdmin && <StatBox label="Neked jár (60%)" value={Math.round(yearRev * STAFF_RATE)} color="#a78bfa" sub="éves bér" large />}
      </div>

      {/* Monthly bar chart */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem 1rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "1rem" }}>
            Havi bontás — kattints egy hónapra a részletekért
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {yearData.map(m => {
              const pct    = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
              const matPct = m.revenue > 0 ? (m.material / m.revenue) * 100 : 0;
              const profit = m.revenue - m.material - m.wage;
              const isCurrentMonth = m.month === now.getMonth() + 1 && year === now.getFullYear();
              return (
                <div key={m.month}
                  onClick={() => goToMonth(m.month)}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.35rem 0.5rem", borderRadius: 8, transition: "background 0.15s", border: isCurrentMonth ? "1px solid rgba(82,118,102,0.2)" : "1px solid transparent" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(82,118,102,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.08em", color: isCurrentMonth ? "var(--color-teal)" : "var(--text-muted)", width: 52, textAlign: "right", flexShrink: 0 }}>
                    {MONTHS[m.month-1]?.slice(0,4)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, height: 22, background: "var(--bg-card)", borderRadius: 5, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(82,118,102,0.55), rgba(82,118,102,0.28))", borderRadius: 5, transition: "width 0.5s ease" }} />
                    {m.material > 0 && (
                      <div style={{ position: "absolute", right: 0, top: 0, width: `${matPct}%`, height: "100%", background: "rgba(160,104,48,0.25)", borderRadius: "0 5px 5px 0" }} />
                    )}
                  </div>
                  <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: m.revenue > 0 ? "#527666" : "var(--text-dim)", fontWeight: 700, minWidth: 85, textAlign: "right" }}>
                    {m.revenue > 0 ? fmt(m.revenue) : "—"}
                  </div>
                  {isAdmin && m.revenue > 0 && (
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: profit >= 0 ? "rgba(82,118,102,0.6)" : "#c47878", minWidth: 80, textAlign: "right" }}>
                      {fmt(profit)}
                    </div>
                  )}
                  {!isAdmin && m.revenue > 0 && (
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: "#a78bfa", minWidth: 80, textAlign: "right" }}>
                      {fmt(Math.round(m.revenue * STAFF_RATE))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
