"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}
function fmtK(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)}e` : `${n}`;
}

const CATEGORY_COLORS = [
  "#527666", "#9878b8", "#c47a8a", "#c9906a", "#7ba8c4",
  "#a06830", "#6a8fa8", "#b87878", "#8a9878", "#c4a878",
];

const WORKER_COLORS: Record<string, string> = { Gitta: "#9878b8", Lili: "#c47a8a", Felicia: "#c9906a" };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(82,118,102,0.6)", textTransform: "uppercase", marginBottom: "1rem" }}>
      ◈ {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem 1.25rem", ...style }}>
      {children}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", color: "var(--color-teal)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: "#527666", fontWeight: 700 }}>{fmt(p.value)}</div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", color: "var(--color-teal)", marginBottom: "0.4rem", letterSpacing: "0.08em" }}>{p.name}</div>
      <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: "#527666", fontWeight: 700 }}>{fmt(p.value)}</div>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", fontStyle: "italic" }}>{p.payload.count} alkalom</div>
    </div>
  );
}

export default function StatisztikaClient({ userId }: { userId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const { data: stats,        isLoading: statsLoading }   = api.finance.stats.useQuery({ year });
  const { data: perUserData = [] }                         = api.finance.perUserYear.useQuery({ year });
  const { data: yearData = [], isLoading: yearLoading }    = api.finance.yearSummary.useQuery({ year });

  const workerStats = perUserData
    .map(u => {
      const isOwner = u.id === userId;
      const earn = u.wage > 0 ? u.wage : (isOwner ? u.revenue + u.material : u.wageEstimate);
      return { ...u, isOwner, earn, totalRev: u.revenue }; // csak szolgáltatási bevétel, anyag nélkül
    })
    .filter(u => u.totalRev > 0 || u.wage > 0);

  const isLoading = statsLoading || yearLoading;

  const navBtn: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
    color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "5rem", fontStyle: "italic", fontSize: "1.1rem" }}>
        Betöltés...
      </div>
    );
  }

  const dowData  = stats?.byDow ?? [];
  const catData  = stats?.byCategory ?? [];
  const bestDow  = [...dowData].sort((a, b) => b.revenue - a.revenue)[0];
  const totalRev = yearData.reduce((s, m) => s + m.revenue + m.material, 0);
  const activeDays = dowData.filter(d => d.count > 0).length;

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Statisztika ✦</h1>
          <p style={{ fontStyle: "italic", color: "var(--color-pink)", opacity: 0.75, fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", margin: "0.3rem 0 0" }}>
            {year}. évi elemzés
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => setYear(y => y - 1)} style={navBtn}>‹</button>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--color-teal)", minWidth: 40, textAlign: "center" }}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={navBtn}>›</button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        {[
          { label: "Éves bevétel", value: fmt(totalRev), sub: `${year}` },
          { label: "Legjobb nap", value: bestDow?.label ?? "—", sub: bestDow ? fmt(bestDow.revenue) : "" },
          { label: "Aktív napok", value: `${activeDays} féle`, sub: "hét napjából" },
          { label: "Kategóriák", value: `${catData.length} db`, sub: "szolgáltatástípus" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.25rem", flex: "1 1 140px", minWidth: 120 }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(82,118,102,0.7)", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "var(--color-teal)", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: "var(--text-soft)", marginTop: "0.2rem", fontStyle: "italic" }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Day of week */}
        <Card>
          <SectionTitle>Hét napjai szerinti bontás</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontFamily: "var(--font-cinzel)", fontSize: 9, fill: "var(--text-muted)", letterSpacing: "0.05em" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]} name="Bevétel">
                {dowData.map((d, i) => (
                  <Cell key={i} fill={d === bestDow ? "#527666" : "rgba(82,118,102,0.4)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {bestDow && bestDow.revenue > 0 && (
            <div style={{ textAlign: "center", marginTop: "0.75rem", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--text-soft)", fontStyle: "italic" }}>
              A legjobb nap a <span style={{ color: "#527666", fontWeight: 600 }}>{bestDow.label}</span> — {bestDow.count} alkalom, összesen {fmt(bestDow.revenue)}
            </div>
          )}
        </Card>

        {/* Service categories + Worker comparison side by side */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>

          {/* Categories pie */}
          {catData.length > 0 && (
            <Card style={{ flex: "1 1 280px" }}>
              <SectionTitle>Szolgáltatás kategóriák</SectionTitle>
              {/* Négyzet arányú terület a körnek */}
              <div style={{ width: "100%", aspectRatio: "1", maxHeight: 320, margin: "0 auto" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catData}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius="46%"
                      innerRadius="24%"
                      paddingAngle={2}
                      label={({ percent }: { percent?: number }) => (percent ?? 0) > 0.06 ? `${Math.round((percent ?? 0) * 100)}%` : ""}
                      labelLine={false}
                    >
                      {catData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend alul */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.75rem", marginTop: "0.75rem", justifyContent: "center" }}>
                {catData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Egyéb breakdown */}
          {(stats?.egyebEntries?.length ?? 0) > 0 && (
            <Card style={{ flex: "1 1 280px" }}>
              <SectionTitle>Mi kerül az „Egyéb"-be?</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 220, overflowY: "auto" }}>
                {stats!.egyebEntries.map((e, i) => (
                  <div key={i} style={{ padding: "0.55rem 0.75rem", background: "var(--bg-card)", borderRadius: 8, borderLeft: "3px solid rgba(160,104,48,0.5)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{e.description}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#a06830", fontWeight: 700, flexShrink: 0 }}>{fmt(e.amount)}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>{e.date}</span>
                      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", color: "rgba(160,104,48,0.7)", letterSpacing: "0.06em" }}>— {e.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Worker comparison */}
          {workerStats.length > 1 && (
            <Card style={{ flex: "1 1 280px" }}>
              <SectionTitle>Dolgozók összehasonlítása</SectionTitle>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>Termelt bevétel</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {workerStats.map(w => {
                  const uc = WORKER_COLORS[w.name] ?? "#7256a0";
                  const pct = totalRev > 0 ? Math.round((w.totalRev / totalRev) * 100) : 0;
                  const withMat = w.revenue + w.material;
                  return (
                    <div key={w.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: uc, fontWeight: 600 }}>{w.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--text-soft)" }}>
                          {fmt(w.totalRev)} <span style={{ fontSize: "0.7rem", color: uc }}>({pct}%)</span>
                          {w.material > 0 && <span style={{ fontSize: "0.75rem", color: "#a06830", marginLeft: "0.4rem" }}>+{fmt(w.material)} anyag = {fmt(withMat)}</span>}
                        </span>
                      </div>
                      <div style={{ height: 7, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: uc, borderRadius: 4, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", margin: "1rem 0 0" }}>Tényleges kereset</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {(() => {
                  const totalCommission = workerStats
                    .filter(w => !w.isOwner)
                    .reduce((s, w) => s + w.revenue - (w.wage > 0 ? w.wage : w.wageEstimate), 0);
                  const row = (label: string, val: number, color: string, sub?: string) => (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0", borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.46rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {label}{sub && <span style={{ color: "#c9906a", marginLeft: "0.3rem" }}>{sub}</span>}
                      </span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color, fontWeight: 700 }}>{fmt(val)}</span>
                    </div>
                  );
                  return workerStats.map(w => {
                    const uc = WORKER_COLORS[w.name] ?? "#7256a0";
                    const grossWage = w.wage > 0 ? w.wage : w.wageEstimate;
                    if (w.isOwner) {
                      const ownerTotal = w.totalRev + totalCommission;
                      return (
                        <div key={w.id}>
                          {row(`${w.name} bevétele`, ownerTotal, uc, totalCommission > 0 ? `(saját + 40%)` : undefined)}
                        </div>
                      );
                    }
                    return (
                      <div key={w.id}>
                        {row(`${w.name} bére (60%)`, grossWage, uc)}
                      </div>
                    );
                  });
                })()}
              </div>
            </Card>
          )}
        </div>

        {/* Monthly radar */}
        {yearData.some(m => m.revenue > 0) && (
          <Card>
            <SectionTitle>Havi eloszlás — pókháló nézet</SectionTitle>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={yearData.map(m => ({ month: ["Jan","Feb","Már","Ápr","Máj","Jún","Júl","Aug","Sep","Okt","Nov","Dec"][m.month-1], revenue: m.revenue + m.material }))}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="month" tick={{ fontFamily: "var(--font-cinzel)", fontSize: 9, fill: "var(--text-muted)", letterSpacing: "0.05em" }} />
                <Radar name="Bevétel" dataKey="revenue" stroke="#527666" fill="#527666" fillOpacity={0.18} strokeWidth={2} dot={{ r: 3, fill: "#527666" }} />
                <Tooltip formatter={(v) => [fmt(Number(v)), "Bevétel"]} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontFamily: "var(--font-playfair)" }} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "var(--text-soft)", fontStyle: "italic", marginTop: "0.5rem" }}>
              A nagyobb terület = magasabb bevétel az adott hónapban
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
