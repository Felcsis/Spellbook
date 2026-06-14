"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { userColor, buildVisitGroups } from "../_client";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month });

  const dayEntries = entries.filter(e => toDateStr(new Date(e.date)) === date);
  const visible    = isAdmin ? dayEntries : dayEntries.filter(e => e.type === "revenue" || e.type === "material");

  const revenue  = visible.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = visible.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wage     = visible.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const profit   = revenue - material - wage;

  const { byDate, sortedDates } = buildVisitGroups(visible);

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
      {revenue > 0 || isAdmin ? (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <StatBox label="Bevétel" value={revenue} color="#527666" sub={`${d.toLocaleDateString("hu-HU", { month: "long", day: "numeric" })}`} large />
          {isAdmin && material > 0 && <StatBox label="Anyagköltség" value={material} color="#a06830" sub="kiadás" />}
          {isAdmin && wage > 0     && <StatBox label="Bérek"        value={wage}     color="#7256a0" sub="kiadás" />}
          {isAdmin && revenue > 0  && <StatBox label="Profit"       value={profit}   color={profit >= 0 ? "#527666" : "#c47878"} sub={revenue > 0 ? `${Math.round((profit/revenue)*100)}%` : ""} large />}
          {!isAdmin && revenue > 0 && <StatBox label="Neked jár (60%)" value={Math.round(revenue * STAFF_RATE)} color="#a78bfa" sub="ma" large />}
        </div>
      ) : null}

      {/* Entry list */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>
      ) : sortedDates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontStyle: "italic" }}>
          Ezen a napon még nincsenek bejegyzések. ✦
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {(byDate[date] ?? []).map(group => {
            const revEntry    = group.entries.find(e => e.type === "revenue");
            const card        = revEntry ? (revEntry as { guestCard?: { guest: { name: string }; services: { name: string; price: number; duration: number; gender?: string | null }[]; materials: { name: string; colorCode?: string | null; grams: number; lineTotal: number }[] } }).guestCard : undefined;
            const isExpanded  = expandedId === group.key;
            const creatorName = revEntry?.createdBy?.name;
            const uCol        = userColor(creatorName);
            const hasMultiple = group.entries.length > 1 || (card && (card.services.length > 1 || card.materials.length > 0));
            return (
              <div key={group.key} style={{ background: "var(--bg-panel)", border: `1px solid ${isExpanded ? uCol + "55" : uCol + "22"}`, borderLeft: `3px solid ${uCol}`, borderRadius: 12, overflow: "hidden" }}>
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
                    {creatorName && <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.78rem", color: uCol, fontStyle: "italic" }}>{creatorName}</div>}
                  </div>
                  {isAdmin ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" }}>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#527666", fontWeight: 700 }}>{fmt(group.totalRevenue)}</span>
                      {group.totalMaterial > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: "#a06830" }}>−{fmt(group.totalMaterial)} anyag</span>}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" }}>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: "var(--text-muted)" }}>{fmt(group.totalRevenue)}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: uCol, fontWeight: 700 }}>{fmt(Math.round(group.totalRevenue * STAFF_RATE))} neked</span>
                    </div>
                  )}
                  {hasMultiple && <span style={{ color: "rgba(82,118,102,0.5)", fontSize: "0.65rem", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>}
                </div>
                {isExpanded && card && (
                  <div style={{ padding: "0 1.1rem 0.9rem 2.5rem", borderTop: "1px solid rgba(82,118,102,0.1)" }}>
                    {card.services.length > 0 && (
                      <div style={{ marginTop: "0.65rem" }}>
                        <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.16em", color: "rgba(82,118,102,0.5)", textTransform: "uppercase", marginBottom: "0.35rem" }}>Elvégzett szolgáltatások</div>
                        {card.services.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.65rem", background: "rgba(82,118,102,0.08)", borderRadius: 7, marginBottom: "0.2rem" }}>
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "#527666", flex: 1 }}>{s.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: "rgba(82,118,102,0.7)", fontWeight: 700 }}>{fmt(s.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {card.materials.length > 0 && (
                      <div style={{ marginTop: "0.65rem" }}>
                        <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.16em", color: "rgba(200,162,68,0.5)", textTransform: "uppercase", marginBottom: "0.35rem" }}>✦ Anyag: {fmt(group.totalMaterial)}</div>
                        {card.materials.map((m, i) => (
                          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", padding: "0.2rem 0.65rem", background: "rgba(200,162,68,0.05)", borderRadius: 6 }}>
                            <span style={{ color: "var(--text-primary)", flex: 1 }}>{m.name}</span>
                            {m.colorCode && <span style={{ color: "#c8a244", fontWeight: 600, fontSize: "0.82rem" }}>{m.colorCode}</span>}
                            <span style={{ color: "#a06830", fontWeight: 700 }}>{fmt(m.lineTotal)}</span>
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
      )}
    </div>
  );
}
