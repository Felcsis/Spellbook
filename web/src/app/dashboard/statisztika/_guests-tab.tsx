"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api } from "~/trpc/react";
import { Card, SectionTitle, TableWrap, Tiles, fmt, td, tdLeft, th } from "./_ui";

const MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
const dateLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "short", day: "numeric" });

export default function GuestsTab() {
  const { data, isLoading } = api.stats.guests.useQuery();
  if (isLoading || !data) return <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>;

  const t = data.totals;
  const hasPhone = data.lapsed.some(g => g.phone);
  const months = data.months.filter(m => m.newGuests + m.returning > 1).map(m => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-soft)", fontStyle: "italic", marginBottom: "-0.5rem" }}>
        A teljes előzményből, a vendégkártyák alapján.
      </div>
      <Tiles items={[
        { label: "Vendégek", value: `${t.guests}`, sub: `${t.visits} látogatás` },
        { label: "Visszajött", value: t.returningShare === null ? "—" : `${Math.round(t.returningShare * 100)}%`, sub: `a legalább 2 hónapja először járt ${t.maturedGuests} vendégből` },
        { label: "Tipikus visszatérés", value: t.medianGap ? `${t.medianGap} nap` : "—", sub: "két látogatás között" },
        { label: "Költés / vendég", value: fmt(t.avgSpendPerGuest), sub: "eddig összesen, anyag nélkül" },
      ]} />

      <Card>
        <SectionTitle hint="Hány különböző vendég járt havonta — és közülük hányan először.">Új és visszatérő vendégek</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={months} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontFamily: "var(--font-cinzel)", fontSize: 9, fill: "var(--text-muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontFamily: "var(--font-cinzel)", fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip cursor={{ fill: "var(--bg-card)" }} content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as (typeof months)[number];
              return (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.6rem 0.9rem", fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--stat-b)", marginRight: 6 }} />Új: {p.newGuests}</div>
                  <div><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--stat-a)", marginRight: 6 }} />Visszatérő: {p.returning}</div>
                </div>
              );
            }} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem" }}
              formatter={(value: string) => <span style={{ color: "var(--text-primary)" }}>{value}</span>} />
            {/* Halmozott oszlop: a szegmensek közti vékony háttérszínű rés választja el a két részt. */}
            <Bar dataKey="returning" name="Visszatérő" stackId="g" fill="var(--stat-a)" stroke="var(--bg-panel)" strokeWidth={2} />
            <Bar dataKey="newGuests" name="Új" stackId="g" fill="var(--stat-b)" stroke="var(--bg-panel)" strokeWidth={2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {data.gapByCategory.length > 0 && (
          <Card style={{ flex: "1 1 280px" }}>
            <SectionTitle hint="Az előző látogatás fő szolgáltatása szerint, középértékkel. Legalább 5 eset kell hozzá.">Mikor jönnek vissza</SectionTitle>
            <TableWrap>
              <thead><tr><th style={{ ...th, textAlign: "left" }}>Kategória</th><th style={th}>Nap</th><th style={th}>Eset</th></tr></thead>
              <tbody>
                {data.gapByCategory.map(g => (
                  <tr key={g.category}>
                    <td style={tdLeft}>{g.category}</td>
                    <td style={td}>{g.medianDays}</td>
                    <td style={{ ...td, color: "var(--text-soft)" }}>{g.samples}{g.samples < 10 ? " · kevés" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        )}

        <Card style={{ flex: "1 1 320px" }}>
          <SectionTitle hint="Eddigi összes költésük, anyag nélkül.">Legértékesebb vendégek</SectionTitle>
          <TableWrap>
            <thead><tr><th style={{ ...th, textAlign: "left" }}>Vendég</th><th style={th}>Alkalom</th><th style={th}>Összesen</th><th style={th}>Utoljára</th></tr></thead>
            <tbody>
              {data.top.map(g => (
                <tr key={g.name + g.lastDate}>
                  <td style={tdLeft}>{g.name}</td><td style={td}>{g.visits}</td><td style={td}>{fmt(g.spend)}</td>
                  <td style={{ ...td, color: "var(--text-soft)" }}>{dateLabel(g.lastDate)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      </div>

      <Card>
        <SectionTitle hint="Legalább 6 hete nem jártak, és a szokásos visszatérési idejük másfélszerese is eltelt. Érdemes rájuk írni vagy felhívni őket — a legtöbbet költők vannak elöl.">
          Rég nem jártak ({data.lapsed.length})
        </SectionTitle>
        {data.lapsed.length === 0 ? (
          <div style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-soft)" }}>Mindenki időben visszajött.</div>
        ) : (
          <TableWrap>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Vendég</th>{hasPhone && <th style={{ ...th, textAlign: "left" }}>Telefon</th>}
              <th style={th}>Utoljára</th><th style={th}>Eltelt</th><th style={{ ...th, textAlign: "left" }}>Mit csináltatott</th>
              <th style={{ ...th, textAlign: "left" }}>Kinél</th><th style={th}>Alkalom</th><th style={th}>Összesen</th>
            </tr></thead>
            <tbody>
              {data.lapsed.map(g => (
                <tr key={g.name + g.lastDate}>
                  <td style={tdLeft}>{g.name}</td>
                  {hasPhone && <td style={{ ...tdLeft, whiteSpace: "nowrap" }}>{g.phone ? <a href={`tel:${g.phone.replace(/\s+/g, "")}`} style={{ color: "var(--color-teal)" }}>{g.phone}</a> : <span style={{ color: "var(--text-soft)" }}>—</span>}</td>}
                  <td style={td}>{dateLabel(g.lastDate)}</td>
                  <td style={td}>{g.since} nap <span style={{ color: "var(--text-soft)" }}>/ {g.expected}</span></td>
                  <td style={{ ...tdLeft, color: "var(--text-soft)", minWidth: 180 }}>{g.lastService}</td>
                  <td style={tdLeft}>{g.worker}</td>
                  <td style={td}>{g.visits}</td>
                  <td style={td}>{fmt(g.spend)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
