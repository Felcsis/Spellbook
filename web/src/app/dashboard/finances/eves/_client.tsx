"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Cell,
} from "recharts";
import PdfExportButton from "../_pdf-export";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Már","Ápr","Máj","Jún","Júl","Aug","Sep","Okt","Nov","Dec"];
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

type ChartEntry = { month: string; monthNum: number; service: number; material: number; total: number; profit: number };

function CustomTooltip({ active, payload, canSeeProfit }: { active?: boolean; payload?: { payload: ChartEntry }[]; canSeeProfit: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem 1.1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 170 }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.14em", color: "var(--color-teal)", marginBottom: "0.55rem", textTransform: "uppercase" }}>{MONTHS[d.monthNum - 1]}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <Row label="Bevétel" value={d.total} color="#527666" />
        {d.material > 0 && <Row label="  ebből anyag" value={d.material} color="#a06830" />}
        {canSeeProfit && <Row label="Profit" value={d.profit} color={d.profit >= 0 ? "#527666" : "#c47878"} />}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1.5rem" }}>
      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color, fontWeight: 700 }}>{fmt(value)}</span>
    </div>
  );
}

function CustomLegend({ canSeeProfit }: { canSeeProfit: boolean }) {
  const item = (color: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
      {item("rgba(82,118,102,0.75)", "Szolgáltatás")}
      {item("rgba(160,104,48,0.65)", "Anyag")}
      {canSeeProfit && item("#c9906a", "Profit")}
    </div>
  );
}

export default function EvesClient({ isAdmin = true, userId = "", canSeeProfit = false }: { isAdmin?: boolean; userId?: string; canSeeProfit?: boolean }) {
  const now = new Date();
  const router = useRouter();
  const [year,         setYear]         = useState(now.getFullYear());
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined);

  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const { data: yearData = [], isLoading } = api.finance.yearSummary.useQuery({ year, filterUserId });
  const { data: perUserData = [] } = api.finance.perUserYear.useQuery({ year }, { enabled: isAdmin });
  const { data: yearExpenses = [] } = api.expenses.list.useQuery({ year }, { enabled: isAdmin });
  const { data: myYearCards = [] } = api.guests.myCardsYear.useQuery({ year }, { enabled: !isAdmin });

  const yearRev      = yearData.reduce((s, m) => s + m.revenue, 0);
  const yearMat      = yearData.reduce((s, m) => s + m.material, 0);
  const yearWage     = yearData.reduce((s, m) => s + m.wage, 0);
  const yearOverhead = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const yearTotalIncome = yearRev + yearMat;

  // Staff: aggregate services from yearly guest cards
  const staffSvcMap: Record<string, { count: number; total: number; category: string }> = {};
  if (!isAdmin) {
    myYearCards.forEach(card => {
      card.services.forEach(s => {
        if (!staffSvcMap[s.name]) staffSvcMap[s.name] = { count: 0, total: 0, category: s.categoryName ?? "" };
        staffSvcMap[s.name]!.count += 1;
        staffSvcMap[s.name]!.total += s.price;
      });
    });
  }
  const staffSvcChart = Object.entries(staffSvcMap)
    .map(([name, d]) => ({ name, count: d.count, total: d.total, category: d.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const staffGuestCount = myYearCards.length;
  const staffMatTotal   = myYearCards.reduce((s, c) => s + c.materials.reduce((ss, m) => ss + m.lineTotal, 0), 0);

  const COLORS: Record<string, string> = { Gitta: "#9878b8", Lili: "#c47a8a", Felicia: "#c9906a" };
  const workerYearStats = perUserData
    .map(u => {
      const isOwner = u.id === userId;
      const earn = u.wage > 0 ? u.wage : (isOwner ? u.revenue + u.material : u.wageEstimate);
      return { ...u, isOwner, earn };
    })
    .filter(u => u.revenue > 0 || u.wage > 0);

  const yearStaffWage     = workerYearStats.filter(w => !w.isOwner).reduce((s, w) => s + w.earn, 0);
  const yearStaffEstimate = workerYearStats.filter(w => !w.isOwner).reduce((s, w) => s + w.wageEstimate, 0);
  const yearProfit        = yearRev - yearStaffWage - yearOverhead;

  const chartData: ChartEntry[] = yearData.map(m => ({
    month:    MONTHS_SHORT[m.month - 1] ?? "",
    monthNum: m.month,
    service:  m.revenue,
    material: m.material,
    total:    m.revenue + m.material,
    profit:   m.revenue - m.wageEstimate,
  }));

  function goToMonth(monthNum: number) {
    router.push(`/dashboard/finances/havi?year=${year}&month=${monthNum}`);
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

      {/* Stat boxes */}
      {(() => {
        const fw = filterUserId ? workerYearStats.find(w => w.id === filterUserId) : null;
        const fwColor = fw ? (COLORS[fw.name] ?? "#7256a0") : "#7256a0";
        const fwCommission = fw && !fw.isOwner ? fw.revenue - fw.wageEstimate : 0;
        return (
          <div className="stat-boxes" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: (!filterUserId && workerYearStats.length > 0) ? "0.75rem" : "2rem" }}>
            <StatBox label={`${year} bevétel`} value={yearTotalIncome} color="#527666" sub="összesen" large />
            {isAdmin && !filterUserId && (yearStaffWage > 0 || yearStaffEstimate > 0) && (
              <StatBox label={yearWage > 0 ? "Bérek" : "Várható bér"} value={yearStaffWage > 0 ? yearStaffWage : yearStaffEstimate} color="#7256a0" sub={yearWage > 0 ? "összesen" : "becslés"} />
            )}
            {isAdmin && !filterUserId && yearOverhead > 0 && <StatBox label="Kiadások" value={yearOverhead} color="#e87171" sub="rezsi, bérleti díj…" />}
            {isAdmin && canSeeProfit && !filterUserId && yearTotalIncome > 0 && (
              <StatBox label="Nyereség" value={yearProfit} color={yearProfit >= 0 ? "#527666" : "#c47878"} sub={`${Math.round((yearProfit / yearTotalIncome) * 100)}% árrés`} large />
            )}
            {fw && fw.material > 0 && <StatBox label="Anyagköltség" value={fw.material} color="#a06830" sub="kiadás" />}
            {fw && !fw.isOwner && fw.wageEstimate > 0 && (
              <StatBox label={fw.wage > 0 ? "Bér" : "60% bér"} value={fw.wage > 0 ? fw.wage : fw.wageEstimate} color={fwColor} sub={fw.wage > 0 ? "rögzített" : "számított"} />
            )}
            {fw && !fw.isOwner && fwCommission > 0 && <StatBox label="40% →Felicia" value={fwCommission} color="#c9906a" sub="jutalék" />}
            {!isAdmin && <>
              <StatBox label="Éves bevétel" value={yearRev} color="#527666" sub="összes munkadíj" large />
              {staffMatTotal > 0 && <StatBox label="Anyagköltség" value={staffMatTotal} color="#a06830" sub="anyag összesen" />}
              <StatBox label={yearWage > 0 ? "Béred" : "Neked jár"} value={yearWage > 0 ? yearWage : yearStaffEstimate} color="#a78bfa" sub={yearWage > 0 ? "rögzített bér" : "számított (60%)"} large />
            </>}
          </div>
        );
      })()}

      {/* Per-worker annual breakdown */}
      {isAdmin && !filterUserId && workerYearStats.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(114,86,160,0.55)", marginBottom: "0.55rem" }}>♦ Éves bontás</div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {workerYearStats.map(w => {
              const uc = COLORS[w.name] ?? "#7256a0";
              const commission = w.revenue - w.wageEstimate;
              const row = (label: string, val: number, color: string) => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.15rem 0" }}>
                  <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color, fontWeight: 700 }}>{fmt(val)}</span>
                </div>
              );
              return (
                <div key={w.id} style={{ background: "var(--bg-card)", border: `1px solid ${uc}33`, borderRadius: 14, padding: "0.85rem 1.25rem", flex: "1 1 180px", minWidth: 170 }}>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", color: `${uc}99`, marginBottom: "0.55rem" }}>{w.name}</div>
                  {row("Éves bevétel", w.revenue + w.material, "#527666")}
                  {!w.isOwner && w.material > 0 && row("Anyagköltség", w.material, "#a06830")}
                  {!w.isOwner && row(w.wage > 0 ? "Bér" : "60% bér", w.earn, uc)}
                  {!w.isOwner && commission > 0 && row("40% →Felicia", commission, "#c9906a")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly chart */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem 1rem 1rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "1.25rem", paddingLeft: "0.5rem" }}>
            Havi bontás — kattints egy hónapra a részletekért
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
              onClick={(e) => { const p = (e as unknown as { activePayload?: { payload: ChartEntry }[] })?.activePayload?.[0]; if (p) goToMonth(p.payload.monthNum); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontFamily: "var(--font-cinzel)", fontSize: 9, fill: "var(--text-muted)", letterSpacing: "0.06em" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}e` : `${v}`}
                tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={<CustomTooltip canSeeProfit={canSeeProfit} />}
                cursor={{ fill: "rgba(255,255,255,0.04)", radius: 6 }}
              />
              <Bar dataKey="service" stackId="inc" fill="rgba(82,118,102,0.75)" name="Szolgáltatás" radius={[0, 0, 4, 4]} style={{ cursor: "pointer" }} />
              <Bar dataKey="material" stackId="inc" fill="rgba(160,104,48,0.65)" name="Anyag" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }} />
              {canSeeProfit && !filterUserId && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#c9906a"
                  strokeWidth={2}
                  dot={{ fill: "#c9906a", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#c9906a" }}
                  name="Profit"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <CustomLegend canSeeProfit={canSeeProfit && !filterUserId} />
        </div>
      )}

      {/* PDF export */}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <PdfExportButton isAdmin={isAdmin} />
        </div>
      )}

      {/* ── Staff: services breakdown chart ── */}
      {!isAdmin && staffSvcChart.length > 0 && (
        <div style={{ marginTop: "2rem", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem 1rem 1rem" }}>
          <div style={{ paddingLeft: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", color: "rgba(124,92,190,0.6)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              ♦ Szolgáltatás-kimutatás — {year}
            </div>
            {staffGuestCount > 0 && (
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "var(--text-soft)", fontStyle: "italic" }}>
                {staffGuestCount} vendéglátogatás, {staffSvcChart.reduce((s, x) => s + x.count, 0)} elvégzett kezelés
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={Math.max(180, staffSvcChart.length * 36)}>
            <BarChart
              data={staffSvcChart}
              layout="vertical"
              margin={{ top: 0, right: 60, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,92,190,0.08)" horizontal={false} />
              <XAxis
                type="number"
                dataKey="count"
                allowDecimals={false}
                tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontFamily: "var(--font-cormorant)", fontSize: 11, fill: "var(--text-primary)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(124,92,190,0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]!.payload as typeof staffSvcChart[0];
                  return (
                    <div style={{ background: "var(--bg-card)", border: "1px solid rgba(124,92,190,0.25)", borderRadius: 10, padding: "0.7rem 1rem", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.12em", color: "#7c5cbe", marginBottom: "0.4rem", textTransform: "uppercase" }}>{d.name}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1.25rem" }}>
                          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>Darab</span>
                          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: "#7c5cbe", fontWeight: 700 }}>{d.count}×</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1.25rem" }}>
                          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>Bevétel</span>
                          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: "#527666", fontWeight: 700 }}>{fmt(d.total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {staffSvcChart.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`rgba(124,92,190,${0.75 - i * 0.04})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Top 3 highlight */}
          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(124,92,190,0.12)", display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {staffSvcChart.slice(0, 3).map((s, i) => (
              <div key={s.name} style={{ flex: "1 1 130px", background: "var(--bg-card)", border: "1px solid rgba(124,92,190,0.2)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.12em", color: "rgba(124,92,190,0.55)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  #{i + 1} legnépszerűbb
                </div>
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 600, marginBottom: "0.15rem" }}>{s.name}</div>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "#7c5cbe" }}>{s.count}× — {fmt(s.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
