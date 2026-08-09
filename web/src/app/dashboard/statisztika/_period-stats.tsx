"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}
function fmtK(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}e` : `${n}`;
}

// Ismert dolgozók fix színe, a többi a tartalék palettából.
const WORKER_COLORS: Record<string, string> = { Gitta: "#9878b8", Lili: "#c47a8a", Felicia: "#c9906a" };
const FALLBACK = ["#527666", "#7ba8c4", "#a06830", "#6a8fa8", "#b87878", "#8a9878", "#c4a878"];
const colorFor = (name: string, i: number) => WORKER_COLORS[name] ?? FALLBACK[i % FALLBACK.length]!;

type Grain = "day" | "week" | "month" | "quarter" | "half" | "year";
const GRAINS: { key: Grain; label: string }[] = [
  { key: "day", label: "Nap" },
  { key: "week", label: "Hét" },
  { key: "month", label: "Hónap" },
  { key: "quarter", label: "Negyedév" },
  { key: "half", label: "Félév" },
  { key: "year", label: "Év" },
];

function shiftAnchor(anchor: Date, g: Grain, dir: number): Date {
  const d = new Date(anchor);
  if (g === "day") d.setDate(d.getDate() + dir);
  else if (g === "week") d.setDate(d.getDate() + 7 * dir);
  else if (g === "month") d.setMonth(d.getMonth() + dir);
  else if (g === "quarter") d.setMonth(d.getMonth() + 3 * dir);
  else if (g === "half") d.setMonth(d.getMonth() + 6 * dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

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

type TimelineTooltipProps = {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
};
function TimelineTooltip({ active, payload, label }: TimelineTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(p => p.value > 0);
  const total = rows.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", minWidth: 130 }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", color: "var(--color-teal)", marginBottom: "0.4rem", letterSpacing: "0.1em" }}>{label}</div>
      {rows.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontFamily: "var(--font-cormorant)", fontSize: "0.85rem" }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: "var(--text-soft)" }}>{fmt(p.value)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.35rem", paddingTop: "0.35rem", borderTop: "1px solid var(--border)", fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "#527666", fontWeight: 700 }}>
        <span>Összesen</span><span>{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function PeriodStats() {
  const [granularity, setGranularity] = useState<Grain>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const { data, isLoading } = api.finance.periodStats.useQuery({
    granularity,
    anchor: anchor.toISOString(),
  });

  const users = data?.users ?? [];
  const perUser = data?.perUser ?? [];
  const combined = data?.combined ?? { revenue: 0, material: 0, wage: 0, wageEstimate: 0, count: 0 };
  const buckets = data?.buckets ?? [];
  const hasData = combined.revenue > 0 || combined.material > 0 || combined.wage > 0;

  const pill = (active: boolean): React.CSSProperties => ({
    background: active ? "#527666" : "var(--bg-card)",
    border: `1px solid ${active ? "#527666" : "var(--border)"}`,
    color: active ? "#fff" : "var(--color-teal)",
    borderRadius: 999, padding: "0.4rem 0.95rem", cursor: "pointer",
    fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase",
    transition: "all 0.2s ease",
  });
  const navBtn: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
    color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      {/* Időszak-választó */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {GRAINS.map(g => (
          <button key={g.key} style={pill(granularity === g.key)} onClick={() => setGranularity(g.key)}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Navigátor + időszak felirat */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.35rem", color: "var(--color-teal)" }}>
          {data?.range.label ?? "…"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button style={navBtn} onClick={() => setAnchor(a => shiftAnchor(a, granularity, -1))}>‹</button>
          <button style={{ ...navBtn, width: "auto", padding: "0 0.9rem", fontSize: "0.6rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }} onClick={() => setAnchor(new Date())}>MA</button>
          <button style={navBtn} onClick={() => setAnchor(a => shiftAnchor(a, granularity, 1))}>›</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés…</div>
      ) : !hasData ? (
        <Card><div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontStyle: "italic", padding: "1.5rem" }}>Ebben az időszakban nincs rögzített adat.</div></Card>
      ) : (
        <>
          {/* Összesített kártyák */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {[
              { label: "Össz bevétel", value: fmt(combined.revenue) },
              { label: "Anyagköltség", value: fmt(combined.material) },
              { label: "Becsült bér", value: fmt(combined.wageEstimate) },
              { label: "Alkalmak", value: `${combined.count} db` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.25rem", flex: "1 1 140px", minWidth: 120 }}>
                <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(82,118,102,0.7)", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.2rem", color: "var(--color-teal)", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Idősoros stacked chart — egybe (oszlopmagasság) + személyenként (szegmensek) */}
          <Card style={{ marginBottom: "1.5rem" }}>
            <SectionTitle>Bevétel időbeli alakulása — személyenkénti bontással</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={buckets} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontFamily: "var(--font-cinzel)", fontSize: 9, fill: "var(--text-muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={buckets.length > 16 ? 1 : 0} />
                <YAxis tickFormatter={fmtK} tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<TimelineTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.06em" }} />
                {users.map((u, i) => (
                  <Bar key={u.id} dataKey={u.id} name={u.name} stackId="rev" fill={colorFor(u.name, i)} radius={i === users.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Személyenkénti bontás */}
          <Card>
            <SectionTitle>Személyenkénti bontás</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {perUser.map((u, i) => {
                const uc = colorFor(u.name, i);
                const pct = combined.revenue > 0 ? Math.round((u.revenue / combined.revenue) * 100) : 0;
                return (
                  <div key={u.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem", flexWrap: "wrap", gap: "0.3rem" }}>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", color: uc, fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: "var(--text-soft)" }}>
                        {fmt(u.revenue)} <span style={{ fontSize: "0.72rem", color: uc }}>({pct}%)</span>
                        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", color: "var(--text-muted)", marginLeft: "0.5rem", letterSpacing: "0.05em" }}>{u.count} alk.</span>
                        {u.material > 0 && <span style={{ fontSize: "0.72rem", color: "#a06830", marginLeft: "0.4rem" }}>+{fmt(u.material)} anyag</span>}
                        <span style={{ fontSize: "0.72rem", color: "#7ba8c4", marginLeft: "0.4rem" }}>bér ~{fmt(u.wageEstimate)}</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: uc, borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
