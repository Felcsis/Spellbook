"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "~/trpc/react";
import { toDateStr } from "~/lib/date";
import { Card, Chips, InlineBar, SectionTitle, TableWrap, Tiles, fmt, td, tdLeft, th } from "./_ui";

type Range = "30" | "90" | "year" | "all";
type SortKey = "revenue" | "count" | "perHour";

function rangeDates(r: Range): { from: string; to: string } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const to = toDateStr(tomorrow);
  if (r === "30")   return { from: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)), to };
  if (r === "90")   return { from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())), to };
  if (r === "year") return { from: `${now.getFullYear()}-01-01`, to };
  return { from: "2000-01-01", to };
}

function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function hours(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} ó${m ? ` ${m} p` : ""}` : `${m} p`;
}

export default function ServicesTab() {
  const [range, setRange] = useState<Range>("90");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [showAll, setShowAll] = useState(false);
  const { from, to } = useMemo(() => rangeDates(range), [range]);
  const { data, isLoading } = api.stats.services.useQuery({ from, to });
  // Telefonon a címke elvinné a diagram helyét: ott rövidebb.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const sorted = useMemo(() => {
    const xs = [...(data?.services ?? [])];
    return xs.sort((a, b) => sort === "count" ? b.count - a.count : sort === "perHour" ? (b.perHour ?? 0) - (a.perHour ?? 0) : b.revenue - a.revenue);
  }, [data, sort]);

  // Az óradíj csak akkor mond valamit, ha legalább 3-szor csinálták.
  const hourly = useMemo(() => (data?.services ?? [])
    .filter(s => s.count >= 3 && s.perHour !== null)
    .sort((a, b) => (b.perHour ?? 0) - (a.perHour ?? 0))
    .slice(0, 12)
    .map(s => ({ label: `${s.category} · ${s.name}`, short: narrow ? clip(`${s.category.split(/[\s/]/)[0]} · ${s.name}`, 20) : clip(`${s.category} · ${s.name}`, 34), perHour: s.perHour ?? 0, count: s.count, avgMinutes: s.avgMinutes })), [data, narrow]);

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-soft)", fontStyle: "italic", maxWidth: 460 }}>
        A vendégkártyákból, listaáron (kedvezmény nélkül). Az anyagot a vendég külön fizeti, ezért az óradíjba nem számít bele.
      </div>
      <Chips value={range} onChange={setRange} options={[
        { key: "30", label: "30 nap" }, { key: "90", label: "3 hónap" }, { key: "year", label: "Idén" }, { key: "all", label: "Minden" },
      ]} />
    </div>
  );

  if (isLoading || !data) return <>{header}<div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div></>;
  if (data.totals.visits === 0) return <>{header}<Card><div style={{ textAlign: "center", fontFamily: "var(--font-cormorant)", color: "var(--text-soft)" }}>Ebben az időszakban nincs vendégkártya.</div></Card></>;

  const t = data.totals;
  const maxCat = Math.max(...data.categories.map(c => c.revenue));
  const sortBtn = (k: SortKey, label: string) => (
    <th style={{ ...th, cursor: "pointer", color: sort === k ? "var(--color-teal)" : th.color }} onClick={() => setSort(k)} title="Rendezés">
      {label}{sort === k ? " ▾" : ""}
    </th>
  );
  const rows = showAll ? sorted : sorted.slice(0, 15);

  return (
    <div>
      {header}
      <Tiles items={[
        { label: "Alkalmak", value: `${t.visits}`, sub: "vendégkártya" },
        { label: "Szolgáltatás díja", value: fmt(t.revenue), sub: "anyag nélkül" },
        { label: "Átlagos kosár", value: fmt(t.avgTicket), sub: `+ ${fmt(Math.round(t.material / t.visits))} anyag` },
        { label: "Óránként", value: t.perHour ? fmt(t.perHour) : "—", sub: `átl. ${hours(t.avgMinutes)} / vendég` },
        { label: "Felszámolt anyag", value: fmt(t.material), sub: "a vendég fizeti" },
      ]} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Card>
          <SectionTitle hint="Mennyit hoz a szolgáltatás díjából egy óra munka — legalább 3 alkalom alapján.">Óránkénti kereset</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.max(160, hourly.length * 30 + 20)}>
            <BarChart data={hourly} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${Math.round(Number(v) / 1000)}e`} tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="short" width={narrow ? 130 : 240} tick={{ fontFamily: "var(--font-cormorant)", fontSize: 12, fill: "var(--text-primary)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--bg-card)" }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]!.payload as (typeof hourly)[number];
                return (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.6rem 0.9rem" }}>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: "var(--text-primary)" }}>{fmt(p.perHour)} / óra</div>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "var(--text-soft)" }}>{p.count} alkalom · átl. {hours(p.avgMinutes)}</div>
                  </div>
                );
              }} />
              <Bar dataKey="perHour" fill="var(--stat-a)" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Kategóriák</SectionTitle>
          <TableWrap>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Kategória</th><th style={th}>Alkalom</th><th style={th}>Díj</th>
              <th style={{ ...th, width: "30%" }}>Arány</th><th style={th}>Óránként</th><th style={th}>Anyag / alk.</th>
            </tr></thead>
            <tbody>
              {data.categories.map(c => (
                <tr key={c.category}>
                  <td style={tdLeft}>{c.category}</td>
                  <td style={td}>{c.count}</td>
                  <td style={td}>{fmt(c.revenue)}</td>
                  <td style={td}><div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ flex: 1 }}><InlineBar value={c.revenue} max={maxCat} /></div><span style={{ minWidth: 34 }}>{Math.round(c.share * 100)}%</span></div></td>
                  <td style={td}>{c.perHour ? fmt(c.perHour) : "—"}</td>
                  <td style={{ ...td, color: "var(--text-soft)" }}>{fmt(Math.round(c.material / c.count))}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>

        <Card>
          <SectionTitle hint="Az oszlopfejlécre kattintva rendezhető.">Szolgáltatások</SectionTitle>
          <TableWrap>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Szolgáltatás</th>
              {sortBtn("count", "Alkalom")}{sortBtn("revenue", "Díj")}
              <th style={th}>Átl. ár</th><th style={th}>Átl. idő</th>
              {sortBtn("perHour", "Óránként")}
              <th style={th}>Anyag / alk.</th><th style={{ ...th, textAlign: "left" }}>Ki csinálja</th>
            </tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.key}>
                  <td style={tdLeft}><span style={{ color: "var(--text-soft)" }}>{s.category} · </span>{s.name}</td>
                  <td style={td}>{s.count}</td>
                  <td style={td}>{fmt(s.revenue)}</td>
                  <td style={td}>{fmt(s.avgPrice)}</td>
                  <td style={td}>{hours(s.avgMinutes)}</td>
                  <td style={td}>{s.perHour ? fmt(s.perHour) : "—"}</td>
                  <td style={{ ...td, color: "var(--text-soft)" }}>{fmt(Math.round(s.material / s.count))}</td>
                  <td style={{ ...tdLeft, color: "var(--text-soft)", whiteSpace: "nowrap" }}>{s.workers.map(w => `${w.name} ${w.count}`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {sorted.length > 15 && (
            <button onClick={() => setShowAll(v => !v)} style={{ marginTop: "0.75rem", background: "none", border: "none", color: "var(--color-teal)", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", cursor: "pointer" }}>
              {showAll ? "Kevesebb" : `Mind a ${sorted.length} mutatása`}
            </button>
          )}
        </Card>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <Card style={{ flex: "1 1 100%" }}>
            <SectionTitle hint="A munkaidő a vendégkártyán rögzített szolgáltatások idejének összege.">Ki mennyit dolgozott</SectionTitle>
            <TableWrap>
              <thead><tr>
                <th style={{ ...th, textAlign: "left" }}>Név</th><th style={th}>Munkaidő</th><th style={{ ...th, width: "18%" }}>Arány</th>
                <th style={th}>Vendég</th><th style={th}>Alkalom</th><th style={th}>Díj</th>
                <th style={th}>Átl. kosár</th><th style={th}>Óránként</th><th style={th}>Anyag / alk.</th>
              </tr></thead>
              <tbody>
                {data.workers.map(w => (
                  <tr key={w.name}>
                    <td style={tdLeft}>{w.name}</td>
                    <td style={td}>{Math.round(w.minutes / 60)} óra</td>
                    <td style={td}><div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ flex: 1 }}><InlineBar value={w.hoursShare} max={1} /></div><span style={{ minWidth: 34 }}>{Math.round(w.hoursShare * 100)}%</span></div></td>
                    <td style={td}>{w.guests}</td><td style={td}>{w.visits}</td><td style={td}>{fmt(w.revenue)}</td>
                    <td style={td}>{fmt(w.avgTicket)}</td><td style={td}>{w.perHour ? fmt(w.perHour) : "—"}</td>
                    <td style={{ ...td, color: "var(--text-soft)" }}>{fmt(w.avgMaterial)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "1rem" }}>
              {data.workers.map(w => (
                <div key={w.name} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: "var(--text-soft)" }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{w.name}</span> ideje:{" "}
                  {w.byCategory.filter(c => c.minutes >= 60).map(c => `${c.category} ${Math.round(c.minutes / 60)} ó (${Math.round((c.minutes / w.minutes) * 100)}%)`).join(" · ")}
                </div>
              ))}
            </div>
          </Card>

          {data.pairs.length > 0 && (
            <Card style={{ flex: "1 1 260px" }}>
              <SectionTitle hint="Egy látogatáson belül.">Gyakran együtt</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {data.pairs.map(p => (
                  <div key={p.a + p.b} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span>{p.a.split(" · ")[1]} <span style={{ color: "var(--text-soft)" }}>+</span> {p.b.split(" · ")[1]}</span>
                    <span style={{ color: "var(--text-soft)", whiteSpace: "nowrap" }}>{p.count}×</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
