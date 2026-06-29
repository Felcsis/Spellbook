"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

const PURPLE = "rgba(110,60,200,0.22)";
const PURPLE_BORDER = "rgba(140,80,220,0.40)";
const GOLD = "#c8a840";
const GOLD_DIM = "rgba(200,168,64,0.55)";
const CREAM = "#f0e4cc";
const CREAM_SOFT = "rgba(240,228,204,0.72)";
const CREAM_DIM = "rgba(240,228,204,0.46)";
const CARD_BG = "rgba(16,8,3,0.68)";
const CARD_BORDER = "rgba(200,168,64,0.18)";

export default function DashboardClient({
  name,
  isAdmin = false,
  userId = "",
}: {
  name?: string | null;
  isAdmin?: boolean;
  userId?: string;
}) {
  const router = useRouter();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayStr = toDateStr(now);

  const { data: entries = [], isLoading } = api.finance.list.useQuery({ year, month, filterUserId: !isAdmin ? userId : undefined });
  const { data: allUsers = [] } = api.calendar.users.useQuery(undefined, { enabled: isAdmin });
  const { data: expenseList = [] } = api.expenses.list.useQuery({ year, month }, { enabled: isAdmin });

  const revenue  = entries.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  const material = entries.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
  const wages    = entries.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
  const expenses = expenseList.reduce((s, e) => s + e.amount, 0);

  const todayRev = entries
    .filter(e => e.type === "revenue" && toDateStr(new Date(e.date)) === todayStr)
    .reduce((s, e) => s + e.amount, 0);

  const recentEntries = entries
    .filter(e => e.type === "revenue")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  function entryWorker(e: { createdBy?: { name?: string | null } | null; workDay?: { user?: { name?: string | null } | null } | null }) {
    return e.workDay?.user?.name ?? e.createdBy?.name ?? "—";
  }

  const workerStats = isAdmin ? allUsers.map(u => {
    const rev = entries.filter(e => e.type === "revenue" && (e.workDay?.user?.id === u.id || e.createdBy?.id === u.id)).reduce((s, e) => s + e.amount, 0);
    return { name: u.name ?? "?", revenue: rev };
  }).filter(w => w.revenue > 0) : [];

  const monthLabel = now.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  const dateLabel  = now.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const STATS = [
    { img: "/spellbook/ikon-bajital.png",    label: "Mai bevétel",  value: todayRev, sub: "mai forgalom" },
    { img: "/spellbook/ikon-ametiszt.png",   label: "Havi bevétel", value: revenue,  sub: monthLabel },
    { img: "/spellbook/ikon-zsak-arany.png", label: "Anyagköltség", value: material, sub: "kiadás" },
    { img: "/spellbook/ikon-zsak-lila.png",  label: "Kiadások",     value: expenses, sub: "havi kiadás" },
  ];

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{
          fontFamily: "var(--font-playfair)",
          fontSize: "2rem",
          color: GOLD,
          margin: 0,
            textShadow: "0 0 20px rgba(200,168,64,0.40)",
        }}>
          Üdvözöllek, {name ?? "Boszorkány"}! ✦
        </h1>
        <p style={{
          fontFamily: "var(--font-cormorant)",
          fontStyle: "italic",
          fontSize: "1.05rem",
          color: CREAM_SOFT,
          margin: "0.3rem 0 0",
          letterSpacing: "0.04em",
        }}>
          itt a varázslat és a szépség találkozik
        </p>
      </div>

      {/* ── Stat boxes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 14,
            padding: "1.25rem 1rem 1rem",
            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          }}>
            <img
              src={s.img} alt=""
              width={54} height={54}
              style={{ objectFit: "contain", marginBottom: "0.65rem" }}
            />
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.25rem", color: CREAM, fontWeight: 700, lineHeight: 1.1, marginBottom: "0.3rem" }}>
              {isLoading ? "…" : fmt(s.value)}
            </div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: "0.2rem" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: CREAM_DIM, fontStyle: "italic" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column: recent entries + stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>

        {/* Recent entries */}
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: "1.25rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: "1rem" }}>
            ✦ Legutóbbi bejegyzések
          </div>
          {recentEntries.length === 0 && !isLoading && (
            <div style={{ fontFamily: "var(--font-cormorant)", color: CREAM_DIM, fontStyle: "italic", fontSize: "0.95rem" }}>
              Még nincs bejegyzés ebben a hónapban.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {recentEntries.map((e, i) => (
              <div key={e.id ?? i} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                padding: "0.5rem 0.65rem",
                borderRadius: 8,
                background: i % 2 === 0 ? "rgba(200,168,64,0.06)" : "transparent",
                gap: "0.5rem",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: CREAM_SOFT }}>
                    {entryWorker(e)}
                    {e.description && <span style={{ color: CREAM_DIM, marginLeft: "0.4rem", fontSize: "0.85rem" }}>— {e.description}</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.12em", color: GOLD_DIM, marginTop: "0.15rem" }}>
                    {new Date(e.date).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "short", day: "numeric" })}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: GOLD, fontWeight: 600, whiteSpace: "nowrap", alignSelf: "center" }}>
                  {fmt(e.amount)}
                </div>
              </div>
            ))}
          </div>
          {recentEntries.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: `1px solid ${CARD_BORDER}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.12em", color: GOLD_DIM }}>ÖSSZES BEVÉTEL</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: GOLD, fontWeight: 700 }}>{fmt(revenue)}</span>
            </div>
          )}
        </div>

        {/* Stats summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Munkások bevételei */}
          {isAdmin && workerStats.length > 0 && (
            <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: "1.25rem", flex: 1 }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: "1rem" }}>
                ✦ Havi bontás
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {workerStats.map(w => {
                  const pct = revenue > 0 ? Math.round((w.revenue / revenue) * 100) : 0;
                  return (
                    <div key={w.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.22rem" }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: CREAM_SOFT }}>{w.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: GOLD }}>{fmt(w.revenue)}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(200,168,64,0.12)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(to right, rgba(110,60,200,0.7), ${GOLD})`, borderRadius: 2, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Összesítő */}
          <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: "1.25rem", flex: 1 }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: "1rem" }}>
              ✦ Havi összesítő
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { label: "Összes bevétel",    value: revenue,  color: "#7ab88a" },
                { label: "Összes anyagköltség", value: material, color: "#c08848" },
                { label: "Bérek",             value: wages > 0 ? wages : Math.round(revenue * 0.6), color: "rgba(140,80,220,0.9)" },
                { label: "Kiadások",          value: expenses, color: "#f87171" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: CREAM_DIM }}>{row.label}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: row.color, fontWeight: 600 }}>{fmt(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quote banner ── */}
      <div style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 12,
        padding: "1.1rem 1.75rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}>
        <span style={{ fontSize: "1.5rem", opacity: 0.7 }}>🪶</span>
        <p style={{
          fontFamily: "var(--font-cormorant)",
          fontStyle: "italic",
          fontSize: "1.05rem",
          color: CREAM_SOFT,
          margin: 0,
          letterSpacing: "0.03em",
        }}>
          „Minden vendég egy új varázslat, minden mosoly a legerősebb bűbáj."
        </p>
        <span style={{ fontSize: "0.7rem", color: GOLD_DIM, whiteSpace: "nowrap", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>✦ {dateLabel}</span>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => router.push("/dashboard/finances")}
          style={{
            padding: "0.7rem 1.5rem",
            borderRadius: 10,
            border: `1px solid ${PURPLE_BORDER}`,
            background: PURPLE,
            color: "#c4a0f0",
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 0 16px rgba(110,60,200,0.18)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(110,60,200,0.35)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = PURPLE; }}
        >
          ✦ Új bejegyzés hozzáadása ◈
        </button>
        <button
          onClick={() => router.push("/dashboard/calendar")}
          style={{
            padding: "0.7rem 1.25rem",
            borderRadius: 10,
            border: `1px solid ${CARD_BORDER}`,
            background: "rgba(200,168,64,0.08)",
            color: GOLD,
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.6rem",
            letterSpacing: "0.12em",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(200,168,64,0.16)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(200,168,64,0.08)"; }}
        >
          🌙 Munkanaptár megnyitása
        </button>
        <button
          onClick={() => router.push("/dashboard/guests")}
          style={{
            padding: "0.7rem 1.25rem",
            borderRadius: 10,
            border: `1px solid ${CARD_BORDER}`,
            background: "rgba(200,168,64,0.08)",
            color: GOLD,
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.6rem",
            letterSpacing: "0.12em",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(200,168,64,0.16)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(200,168,64,0.08)"; }}
        >
          📖 Recept könyv
        </button>
      </div>
    </div>
  );
}
