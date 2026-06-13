"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS  = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const DAYS_S  = ["H","K","Sz","Cs","P","Szo","V"];
const DAYS_L  = ["Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat","Vasárnap"];
const USER_COLORS = ["#c9a84c","#a78bfa","#e8b4c8","#6ee7b7","#fb923c"];
const COST_CONFIG = {
  material: { label: "Anyagköltség", color: "#fbbf24", icon: "✦" },
  wage:     { label: "Bér",          color: "#a78bfa", icon: "♦" },
} as const;

type View = "month" | "week" | "3day" | "day";
type CostType = keyof typeof COST_CONFIG;

type ServiceItem = { id: string; name: string; price: number; duration: number };
type ServiceCategory = { id: string; name: string; services: ServiceItem[] };

type WorkDay = {
  id: string; date: Date | string; userId: string;
  earnings: number; notes: string | null;
  user: { id: string; name: string | null };
  services?: { serviceId: string; priceSnap: number; service: { id: string; name: string; price: number } }[];
};
type FinanceEntry = {
  id: string; date: Date | string; type: string;
  description: string; amount: number; workDayId: string | null;
  createdBy: { name: string | null };
};
type GuestCard = {
  id: string; date: Date | string; total: number;
  guest:    { id: string; name: string };
  worker:   { id: string; name: string | null };
  services: { name: string; price: number }[];
};
type User = { id: string; name: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function weekStart(d: Date) { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; }

const dim = "rgba(44,36,32,0.45)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(215,205,190,0.7)",
  border: "1px solid rgba(74,124,126,0.15)", borderRadius: "10px",
  padding: "0.7rem 0.9rem", color: "#2c2420",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", transition: "border-color 0.3s, box-shadow 0.3s",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem",
  letterSpacing: "0.2em", textTransform: "uppercase",
  color: "rgba(74,124,126,0.6)", marginBottom: "0.4rem",
};
const navBtnStyle: React.CSSProperties = {
  background: "rgba(215,205,190,0.7)", border: "1px solid rgba(74,124,126,0.15)",
  borderRadius: "8px", color: "#4a7c7e", fontSize: "1.2rem",
  width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// ── Day modal ─────────────────────────────────────────────────────────────────
function DayModal({ dateStr, workEntries, costEntries, guestCards, users, userColors, onClose }: {
  dateStr: string; workEntries: WorkDay[]; costEntries: FinanceEntry[];
  guestCards: GuestCard[]; users: User[]; userColors: Record<string, string>; onClose: () => void;
}) {
  const utils  = api.useUtils();
  const inv    = () => void utils.calendar.month.invalidate();
  const upsert = api.calendar.upsert.useMutation({ onSuccess: inv });
  const delW   = api.calendar.delete.useMutation({ onSuccess: inv });
  const addC   = api.calendar.addCost.useMutation({ onSuccess: inv });
  const delC   = api.calendar.deleteCost.useMutation({ onSuccess: inv });

  const { data: categories = [] }  = api.calendar.services.useQuery();
  const { data: matCatalog = [] }  = api.materials.list.useQuery();

  const [tab,            setTab]            = useState<"work" | "cost">("work");
  const [userId,         setUserId]         = useState(users[0]?.id ?? "");
  const [selectedSvc,    setSelectedSvc]    = useState<Set<string>>(new Set());
  const [earnings,       setEarnings]       = useState("");
  const [earningsManual, setEarningsManual] = useState(false);
  const [wNotes,         setWNotes]         = useState("");
  // Service search
  const [svcSearch,      setSvcSearch]      = useState("");
  const [svcOpen,        setSvcOpen]        = useState(false);
  // Material cost inline
  const [matDesc,        setMatDesc]        = useState("");
  const [matAmt,         setMatAmt]         = useState("");
  const [matOpen,        setMatOpen]        = useState(false);
  const [matManual,      setMatManual]      = useState(false);
  // Cost tab
  const [costType,    setCostType]    = useState<CostType>("material");
  const [costDesc,    setCostDesc]    = useState("");
  const [costAmt,     setCostAmt]     = useState("");

  const displayDate = new Date(dateStr + "T12:00:00")
    .toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const dayRevenue = workEntries.reduce((s, e) => s + e.earnings, 0);
  const dayCosts   = costEntries.reduce((s, e) => s + e.amount, 0);
  const dayProfit  = dayRevenue - dayCosts;

  // Auto-calculate earnings from selected services
  function addService(svcId: string) {
    setSelectedSvc(prev => {
      const next = new Set(prev);
      next.add(svcId);
      if (!earningsManual) {
        const total = Array.from(next).reduce((s, id) => s + (allServicesMap[id]?.price ?? 0), 0);
        setEarnings(total > 0 ? String(total) : "");
      }
      return next;
    });
    setSvcSearch(""); setSvcOpen(false);
  }

  function removeService(svcId: string) {
    setSelectedSvc(prev => {
      const next = new Set(prev);
      next.delete(svcId);
      if (!earningsManual) {
        const total = Array.from(next).reduce((s, id) => s + (allServicesMap[id]?.price ?? 0), 0);
        setEarnings(total > 0 ? String(total) : "");
      }
      return next;
    });
  }

  function handleEarningsChange(val: string) {
    setEarnings(val);
    setEarningsManual(true);
  }

  function resetWork() {
    setSelectedSvc(new Set()); setEarnings(""); setEarningsManual(false);
    setWNotes(""); setSvcSearch(""); setSvcOpen(false);
    setMatDesc(""); setMatAmt(""); setMatOpen(false); setMatManual(false);
  }

  const filteredMat = matDesc.trim()
    ? matCatalog.filter(m => m.name.toLowerCase().includes(matDesc.toLowerCase()))
    : matCatalog;

  // Filtered services for dropdown
  const allServicesFlat: (ServiceItem & { categoryName: string })[] = [];
  categories.forEach(c => c.services.forEach(s => allServicesFlat.push({ ...s, categoryName: c.name })));
  const allServicesMap: Record<string, ServiceItem> = {};
  allServicesFlat.forEach(s => { allServicesMap[s.id] = s; });

  const filteredSvcs = svcSearch.trim()
    ? allServicesFlat.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()) || s.categoryName.toLowerCase().includes(svcSearch.toLowerCase()))
    : allServicesFlat;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 pt-12"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#e6ddd0", border: "1px solid rgba(74,124,126,0.2)", borderRadius: "20px", padding: "2rem 2.25rem", width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(74,124,126,0.6)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Napi bejegyzések</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "#4a7c7e", textTransform: "capitalize" }}>{displayDate}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(44,36,32,0.3)", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>
        </div>

        {/* Daily summary bar */}
        {(dayRevenue > 0 || dayCosts > 0) && (
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", padding: "0.85rem 1rem", background: "rgba(212,202,187,0.65)", borderRadius: "12px", border: "1px solid rgba(74,124,126,0.1)" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.15em", color: "#6ee7b7aa", marginBottom: "0.2rem" }}>BEVÉTEL</div>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: "#6ee7b7", fontWeight: 700 }}>{fmt(dayRevenue)}</div>
            </div>
            <div style={{ width: 1, background: "rgba(74,124,126,0.12)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.15em", color: "#fbbf24aa", marginBottom: "0.2rem" }}>KIADÁS</div>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: "#fbbf24", fontWeight: 700 }}>{fmt(dayCosts)}</div>
            </div>
            <div style={{ width: 1, background: "rgba(74,124,126,0.12)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.15em", color: dayProfit >= 0 ? "#6ee7b7aa" : "#f87171aa", marginBottom: "0.2rem" }}>PROFIT</div>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: dayProfit >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmt(dayProfit)}</div>
            </div>
          </div>
        )}

        {/* Existing work entries */}
        {workEntries.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.16em", color: "#6ee7b7aa", textTransform: "uppercase", marginBottom: "0.5rem" }}>◈ Munkadíjak</div>
            {workEntries.map(e => {
              const col = userColors[e.userId] ?? "#c9a84c";
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.9rem", background: `${col}12`, border: `1px solid ${col}30`, borderRadius: "10px", marginBottom: "0.35rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}88`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.98rem", color: col }}>{e.user.name}</div>
                    {e.notes && <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: `${col}88` }}>{e.notes}</div>}
                  </div>
                  <div style={{ fontFamily: "var(--font-playfair)", color: col, fontWeight: 700, fontSize: "0.98rem" }}>{fmt(e.earnings)}</div>
                  <button onClick={() => delW.mutate({ id: e.id })} style={delBtnStyle}
                    onMouseEnter={el => { (el.target as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={el => { (el.target as HTMLElement).style.color = "rgba(44,36,32,0.2)"; }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Guest cards */}
        {guestCards.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.16em", color: "rgba(232,180,200,0.7)", textTransform: "uppercase", marginBottom: "0.5rem" }}>♦ Vendég kártyák</div>
            {guestCards.map(card => {
              const col = userColors[card.worker.id] ?? "#c9a84c";
              return (
                <div key={card.id} style={{ padding: "0.65rem 0.9rem", background: "rgba(232,180,200,0.07)", border: "1px solid rgba(232,180,200,0.2)", borderRadius: "10px", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8b4c8", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.98rem", color: "#2c2420" }}>{card.guest.name}</div>
                      <div style={{ fontSize: "0.75rem", color: dim, fontStyle: "italic" }}>
                        {card.worker.name}{card.services.length > 0 && ` · ${card.services.map(s => s.name).join(", ")}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-playfair)", color: col, fontWeight: 700, fontSize: "0.98rem" }}>{fmt(card.total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Existing cost entries */}
        {costEntries.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.16em", color: "#fbbf24aa", textTransform: "uppercase", marginBottom: "0.5rem" }}>✦ Kiadások</div>
            {costEntries.map(e => {
              const col = e.type === "material" ? "#fbbf24" : "#a78bfa";
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 0.9rem", background: `${col}10`, border: `1px solid ${col}28`, borderRadius: "10px", marginBottom: "0.35rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.98rem", color: col }}>{e.description}</div>
                    <div style={{ fontSize: "0.72rem", color: `${col}77`, fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>{COST_CONFIG[e.type as CostType]?.label}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-playfair)", color: col, fontWeight: 700, fontSize: "0.98rem" }}>{fmt(e.amount)}</div>
                  <button onClick={() => delC.mutate({ id: e.id })} style={delBtnStyle}
                    onMouseEnter={el => { (el.target as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={el => { (el.target as HTMLElement).style.color = "rgba(44,36,32,0.2)"; }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(74,124,126,0.1)", margin: "1rem 0" }} />

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(212,202,187,0.65)", border: "1px solid rgba(74,124,126,0.12)", borderRadius: "10px", padding: "3px", gap: "3px", marginBottom: "1.1rem" }}>
          {([["work", "◈ Munkadíj"], ["cost", "✦ Kiadás"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: "7px", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.12em", background: tab === key ? "rgba(74,124,126,0.12)" : "transparent", color: tab === key ? "#4a7c7e" : "rgba(44,36,32,0.4)", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Work entry form */}
        {tab === "work" && (
          <form onSubmit={async e => {
            e.preventDefault();
            await upsert.mutateAsync({
              date: dateStr, userId,
              earnings: parseFloat(earnings) || 0,
              notes: wNotes || undefined,
              serviceIds: Array.from(selectedSvc),
            });
            if (matDesc.trim() && matAmt) {
              await addC.mutateAsync({ date: dateStr, type: "material", description: matDesc.trim(), amount: parseFloat(matAmt) });
            }
            resetWork();
          }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Worker */}
            <div>
              <label style={labelStyle}>Ki dolgozott?</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {users.map(u => {
                  const col = userColors[u.id] ?? "#c9a84c";
                  return (
                    <button key={u.id} type="button" onClick={() => setUserId(u.id)}
                      style={{ padding: "0.45rem 0.9rem", borderRadius: "8px", cursor: "pointer", border: userId === u.id ? `1px solid ${col}88` : "1px solid rgba(74,124,126,0.1)", background: userId === u.id ? `${col}18` : "transparent", color: userId === u.id ? col : "rgba(44,36,32,0.45)", fontFamily: "var(--font-cormorant)", fontSize: "1rem", transition: "all 0.2s" }}>
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service search dropdown */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Elvégzett szolgáltatások</label>

              {/* Selected service tags */}
              {selectedSvc.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                  {Array.from(selectedSvc).map(id => {
                    const svc = allServicesMap[id]; if (!svc) return null;
                    const col = userColors[userId] ?? "#c9a84c";
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.28rem 0.65rem", borderRadius: "7px", background: `${col}18`, border: `1px solid ${col}55` }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: col }}>{svc.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.72rem", color: col, fontWeight: 700, opacity: 0.75 }}>{fmt(svc.price)}</span>
                        <button type="button" onClick={() => removeService(id)}
                          style={{ background: "none", border: "none", color: `${col}88`, cursor: "pointer", fontSize: "0.75rem", padding: "0 0.1rem", lineHeight: 1 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              <div style={{ position: "relative" }}>
                <input
                  value={svcSearch}
                  onChange={e => { setSvcSearch(e.target.value); setSvcOpen(true); }}
                  onFocus={() => setSvcOpen(true)}
                  onBlur={() => setTimeout(() => setSvcOpen(false), 150)}
                  placeholder={allServicesFlat.length === 0 ? "Nincs még szolgáltatás felvéve…" : "Keress: pl. Balayage…"}
                  style={{ ...inputStyle }}
                />
                {svcSearch && (
                  <button type="button" onClick={() => { setSvcSearch(""); setSvcOpen(false); }}
                    style={{ position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(44,36,32,0.3)", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
                )}
              </div>

              {/* Dropdown list */}
              {svcOpen && filteredSvcs.length > 0 && (
                <div style={{ position: "absolute", left: 0, right: 0, zIndex: 100, background: "#e6ddd0", border: "1px solid rgba(74,124,126,0.18)", borderRadius: "12px", marginTop: "0.25rem", maxHeight: 220, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
                  {filteredSvcs.map((svc, i) => {
                    const already = selectedSvc.has(svc.id);
                    const col = userColors[userId] ?? "#c9a84c";
                    const showCat = i === 0 || filteredSvcs[i - 1]?.categoryName !== svc.categoryName;
                    return (
                      <div key={svc.id}>
                        {showCat && (
                          <div style={{ padding: "0.45rem 0.9rem 0.2rem", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "rgba(74,124,126,0.3)", textTransform: "uppercase" }}>
                            {svc.categoryName}
                          </div>
                        )}
                        <div
                          onMouseDown={() => { if (!already) addService(svc.id); }}
                          style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.9rem", cursor: already ? "default" : "pointer", background: already ? "rgba(208,198,182,0.5)" : "transparent", transition: "background 0.15s", opacity: already ? 0.45 : 1 }}
                          onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = `${col}12`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = already ? "rgba(208,198,182,0.5)" : "transparent"; }}>
                          {already && <span style={{ fontSize: "0.65rem", color: col }}>✓</span>}
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: already ? "rgba(44,36,32,0.4)" : "#2c2420", flex: 1 }}>{svc.name}</span>
                          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: col, fontWeight: 700 }}>{fmt(svc.price)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Earnings */}
            <div>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Munkadíj (Ft)
                {selectedSvc.size > 0 && !earningsManual && (
                  <span style={{ color: "rgba(110,231,183,0.7)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>AUTO</span>
                )}
              </label>
              <input type="number" value={earnings} onChange={e => handleEarningsChange(e.target.value)}
                placeholder="0" min="0" required style={{
                  ...inputStyle,
                  borderColor: selectedSvc.size > 0 && !earningsManual ? "rgba(110,231,183,0.4)" : "rgba(74,124,126,0.15)",
                }}
                onFocus={e => { e.target.style.borderColor = userColors[userId] ?? "#4a7c7e"; }}
                onBlur={e => { e.target.style.borderColor = selectedSvc.size > 0 && !earningsManual ? "rgba(110,231,183,0.4)" : "rgba(74,124,126,0.15)"; }} />
            </div>

            {/* Inline material cost */}
            <div style={{ padding: "0.85rem 1rem", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.16em", color: "rgba(251,191,36,0.55)", textTransform: "uppercase" }}>✦ Anyagköltség (opcionális)</div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                {/* Material search */}
                <div style={{ flex: 2, position: "relative" }}>
                  <input value={matDesc} onChange={e => { setMatDesc(e.target.value); setMatOpen(true); }}
                    onFocus={() => setMatOpen(true)}
                    onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                    placeholder={matCatalog.length === 0 ? "pl. Szőkítő…" : "Keress az anyagtárban…"}
                    style={{ ...inputStyle, width: "100%" }}
                    onFocusCapture={e => { (e.target as HTMLInputElement).style.borderColor = "#fbbf24"; }}
                    onBlurCapture={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(74,124,126,0.15)"; }} />
                  {matDesc && (
                    <button type="button" onClick={() => { setMatDesc(""); setMatAmt(""); setMatManual(false); setMatOpen(false); }}
                      style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(44,36,32,0.3)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                  )}
                  {matOpen && filteredMat.length > 0 && (
                    <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "#e6ddd0", border: "1px solid rgba(74,124,126,0.18)", borderRadius: "10px", marginTop: "0.2rem", maxHeight: 180, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                      {filteredMat.map(m => (
                        <div key={m.id}
                          onMouseDown={() => {
                            setMatDesc(m.name);
                            if (!matManual) setMatAmt(String(m.price));
                            setMatOpen(false);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.85rem", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: "#2c2420", flex: 1 }}>{m.name}</span>
                          {m.unit && <span style={{ fontSize: "0.72rem", color: "rgba(74,124,126,0.5)" }}>{m.unit}</span>}
                          <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: "#fbbf24", fontWeight: 700 }}>{fmt(m.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" value={matAmt} onChange={e => { setMatAmt(e.target.value); setMatManual(true); }}
                  placeholder="0 Ft" min="0"
                  style={{ ...inputStyle, flex: 1, borderColor: matAmt && !matManual ? "rgba(251,191,36,0.4)" : "rgba(74,124,126,0.15)" }}
                  onFocus={e => { e.target.style.borderColor = "#fbbf24"; }}
                  onBlur={e => { e.target.style.borderColor = matAmt && !matManual ? "rgba(251,191,36,0.4)" : "rgba(74,124,126,0.15)"; }} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={wNotes} onChange={e => setWNotes(e.target.value)} placeholder="pl. Extra kezelés…" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#4a7c7e"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(74,124,126,0.15)"; }} />
            </div>

            <SaveBtn loading={upsert.isPending || addC.isPending} />
          </form>
        )}

        {/* Cost entry form */}
        {tab === "cost" && (
          <form onSubmit={e => { e.preventDefault(); addC.mutate({ date: dateStr, type: costType, description: costDesc, amount: parseFloat(costAmt) }); setCostDesc(""); setCostAmt(""); }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(Object.entries(COST_CONFIG) as [CostType, typeof COST_CONFIG[CostType]][]).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setCostType(key)}
                  style={{ flex: 1, padding: "0.55rem", borderRadius: "8px", cursor: "pointer", border: costType === key ? `1px solid ${cfg.color}88` : "1px solid rgba(74,124,126,0.1)", background: costType === key ? `${cfg.color}18` : "transparent", color: costType === key ? cfg.color : "rgba(44,36,32,0.45)", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", transition: "all 0.2s" }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Leírás</label>
                <input value={costDesc} onChange={e => setCostDesc(e.target.value)} placeholder="pl. L'Oréal festék..." required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = COST_CONFIG[costType].color; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(74,124,126,0.15)"; }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Összeg (Ft)</label>
                <input type="number" value={costAmt} onChange={e => setCostAmt(e.target.value)} placeholder="0" min="1" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = COST_CONFIG[costType].color; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(74,124,126,0.15)"; }} />
              </div>
            </div>
            <SaveBtn loading={addC.isPending} />
          </form>
        )}
      </div>
    </div>
  );
}

const delBtnStyle: React.CSSProperties = { background: "none", border: "none", color: "rgba(44,36,32,0.2)", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem 0.35rem", borderRadius: "5px", transition: "color 0.2s" };

function SaveBtn({ loading }: { loading: boolean }) {
  return (
    <button type="submit" disabled={loading}
      style={{ padding: "0.8rem", border: "none", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.18em", color: "#fff", background: "linear-gradient(120deg, #7a6229 0%, #c9a84c 50%, #7a6229 100%)", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite", boxShadow: "0 4px 16px rgba(74,124,126,0.18)", opacity: loading ? 0.7 : 1 }}>
      {loading ? "Mentés..." : "Mentés ✦"}
    </button>
  );
}

// ── Worker chip ───────────────────────────────────────────────────────────────
function WorkerChip({ entry, color, expanded, onClick }: { entry: WorkDay; color: string; expanded: boolean; onClick: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ padding: expanded ? "0.8rem 0.9rem" : "0.28rem 0.55rem", borderRadius: "9px", background: expanded ? `${color}20` : `${color}14`, border: `1px solid ${expanded ? color + "66" : color + "28"}`, cursor: "pointer", transition: "all 0.25s", marginBottom: "0.25rem", boxShadow: expanded ? `0 4px 16px ${color}20` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}99` }} />
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color, flex: 1 }}>{entry.user.name}</span>
        <span style={{ fontFamily: "var(--font-playfair)", fontSize: expanded ? "0.95rem" : "0.72rem", color, fontWeight: 700, flexShrink: 0 }}>{expanded ? fmt(entry.earnings) : `${Math.round(entry.earnings / 1000)}k`}</span>
      </div>
      {expanded && entry.notes && <div style={{ marginTop: "0.3rem", paddingTop: "0.3rem", borderTop: `1px solid ${color}22`, fontStyle: "italic", fontSize: "0.82rem", color: `${color}bb`, fontFamily: "var(--font-cormorant)" }}>{entry.notes}</div>}
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({ date, workEntries, costEntries, guestCards = [], userColors, isToday, onOpen, compact = false }: {
  date: Date; workEntries: WorkDay[]; costEntries: FinanceEntry[]; guestCards?: GuestCard[];
  userColors: Record<string, string>; isToday: boolean; onOpen: (ds: string) => void; compact?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dateStr    = toDateStr(date);
  const revenue    = workEntries.reduce((s, e) => s + e.earnings, 0);
  const costs      = costEntries.reduce((s, e) => s + e.amount, 0);
  const profit     = revenue - costs;
  const dow        = (date.getDay() + 6) % 7;

  return (
    <div style={{ flex: 1, minWidth: 0, background: isToday ? "rgba(74,124,126,0.04)" : "transparent", border: isToday ? "1px solid rgba(74,124,126,0.18)" : "1px solid rgba(74,124,126,0.08)", borderRadius: "14px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div onClick={() => onOpen(dateStr)}
        style={{ padding: compact ? "0.55rem 0.7rem" : "0.85rem 1rem", borderBottom: "1px solid rgba(74,124,126,0.09)", cursor: "pointer", background: isToday ? "rgba(74,124,126,0.09)" : "rgba(208,198,182,0.5)", transition: "background 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(74,124,126,0.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "rgba(74,124,126,0.09)" : "rgba(208,198,182,0.5)"; }}>
        <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.1em", color: isToday ? "#4a7c7e" : "rgba(74,124,126,0.6)", textTransform: "uppercase" }}>{DAYS_L[dow]}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: compact ? "1.05rem" : "1.35rem", color: isToday ? "#4a7c7e" : "#2c2420", lineHeight: 1.1 }}>
            {date.getDate()}
            {!compact && <span style={{ fontSize: "0.78rem", color: "rgba(44,36,32,0.35)", marginLeft: "0.35rem" }}>{MONTHS[date.getMonth()]}</span>}
          </div>
          {profit !== 0 && (
            <div style={{ textAlign: "right" }}>
              {revenue > 0 && <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "#6ee7b7", fontWeight: 700 }}>{fmt(revenue)}</div>}
              {costs > 0   && <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.62rem", color: "#fbbf24" }}>−{fmt(costs)}</div>}
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: profit >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{profit >= 0 ? "=" : ""}{fmt(profit)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0.55rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {workEntries.map(e => (
          <WorkerChip key={e.id} entry={e} color={userColors[e.userId] ?? "#c9a84c"} expanded={expandedId === e.id} onClick={() => setExpandedId(expandedId === e.id ? null : e.id)} />
        ))}
        {costEntries.map(e => {
          const col = e.type === "material" ? "#fbbf24" : "#a78bfa";
          return (
            <div key={e.id} style={{ padding: "0.22rem 0.5rem", borderRadius: "7px", background: `${col}12`, border: `1px solid ${col}25`, marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: col, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.76rem", color: col, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.66rem", color: col, fontWeight: 700 }}>−{Math.round(e.amount / 1000)}k</span>
            </div>
          );
        })}
        {guestCards.map(c => (
          <div key={c.id} style={{ padding: "0.22rem 0.5rem", borderRadius: "7px", background: "rgba(232,180,200,0.12)", border: "1px solid rgba(232,180,200,0.28)", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#e8b4c8", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.76rem", color: "#e8b4c8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>♦ {c.guest.name}</span>
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.66rem", color: "#e8b4c8", fontWeight: 700 }}>{Math.round(c.total / 1000)}k</span>
          </div>
        ))}
        <div onClick={() => onOpen(dateStr)}
          style={{ marginTop: "auto", padding: "0.22rem", borderRadius: "6px", border: "1px dashed rgba(74,124,126,0.12)", color: "rgba(74,124,126,0.25)", fontSize: "0.72rem", textAlign: "center", cursor: "pointer", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em", transition: "all 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,124,126,0.4)"; (e.currentTarget as HTMLElement).style.color = "#4a7c7e"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,124,126,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(74,124,126,0.25)"; }}>
          + bejegyzés
        </div>
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({ year, month, byDate, byCostDate, byGuestCardDate, userColors, today, onOpen }: {
  year: number; month: number;
  byDate: Record<string, WorkDay[]>; byCostDate: Record<string, FinanceEntry[]>;
  byGuestCardDate: Record<string, GuestCard[]>;
  userColors: Record<string, string>; today: string; onOpen: (d: string) => void;
}) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const firstDay    = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ background: "rgba(208,198,182,0.5)", border: "1px solid rgba(74,124,126,0.12)", borderRadius: "20px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid rgba(74,124,126,0.09)" }}>
        {DAYS_S.map(d => <div key={d} style={{ padding: "0.6rem 0", textAlign: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.15em", color: "rgba(74,124,126,0.6)", textTransform: "uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} style={{ minHeight: 88, borderRight: "1px solid rgba(74,124,126,0.06)", borderBottom: "1px solid rgba(74,124,126,0.06)", background: "rgba(74,124,126,0.03)" }} />;
          const ds       = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const wEntries = byDate[ds] ?? [];
          const cEntries = byCostDate[ds] ?? [];
          const gCards   = byGuestCardDate[ds] ?? [];
          const revenue  = wEntries.reduce((s, e) => s + e.earnings, 0);
          const costs    = cEntries.reduce((s, e) => s + e.amount, 0);
          const profit   = revenue - costs;
          const isToday  = ds === today;

          return (
            <div key={ds}
              style={{ minHeight: 88, padding: "0.38rem", borderRight: "1px solid rgba(74,124,126,0.06)", borderBottom: "1px solid rgba(74,124,126,0.06)", background: isToday ? "rgba(74,124,126,0.05)" : "transparent", cursor: "pointer", transition: "background 0.18s", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(74,124,126,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "rgba(74,124,126,0.05)" : "transparent"; }}>
              {/* Day number */}
              <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", color: isToday ? "#fff" : "rgba(44,36,32,0.45)", background: isToday ? "#4a7c7e" : "transparent", marginBottom: "0.25rem" }}>{day}</div>

              {/* Work entries */}
              {wEntries.map(e => {
                const col = userColors[e.userId] ?? "#c9a84c";
                const exp = expandedEntry === e.id;
                return (
                  <div key={e.id} onClick={ev => { ev.stopPropagation(); setExpandedEntry(exp ? null : e.id); }}
                    style={{ padding: exp ? "0.3rem 0.45rem" : "0.15rem 0.38rem", borderRadius: "5px", background: `${col}${exp ? "22" : "16"}`, border: `1px solid ${col}${exp ? "55" : "25"}`, marginBottom: "0.18rem", transition: "all 0.2s", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.72rem", color: col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.user.name}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.64rem", color: col, fontWeight: 700 }}>{Math.round(e.earnings / 1000)}k</span>
                    </div>
                    {exp && <div style={{ marginTop: "0.2rem", paddingTop: "0.2rem", borderTop: `1px solid ${col}22` }}><div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: col, fontWeight: 700 }}>{fmt(e.earnings)}</div>{e.notes && <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: `${col}88` }}>{e.notes}</div>}</div>}
                  </div>
                );
              })}

              {/* Cost chips */}
              {cEntries.map(e => {
                const col = e.type === "material" ? "#fbbf24" : "#a78bfa";
                return <div key={e.id} style={{ padding: "0.12rem 0.35rem", borderRadius: "4px", background: `${col}12`, border: `1px solid ${col}22`, marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem" }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: col, flexShrink: 0 }} /><span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.68rem", color: col, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</span><span style={{ fontSize: "0.62rem", color: col, fontWeight: 700 }}>−{Math.round(e.amount / 1000)}k</span></div>;
              })}

              {/* Guest card chips */}
              {gCards.map(c => (
                <div key={c.id} style={{ padding: "0.12rem 0.35rem", borderRadius: "4px", background: "rgba(232,180,200,0.12)", border: "1px solid rgba(232,180,200,0.28)", marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#e8b4c8", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.68rem", color: "#e8b4c8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.guest.name}</span>
                  <span style={{ fontSize: "0.62rem", color: "#e8b4c8", fontWeight: 700 }}>{Math.round(c.total / 1000)}k</span>
                </div>
              ))}

              {/* Add */}
              <div onClick={() => onOpen(ds)} style={{ padding: "0.12rem 0.35rem", borderRadius: "4px", border: "1px dashed rgba(74,124,126,0.1)", color: "rgba(74,124,126,0.18)", fontSize: "0.6rem", textAlign: "center", cursor: "pointer", fontFamily: "var(--font-cinzel)", transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#4a7c7e"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,124,126,0.38)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(74,124,126,0.18)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(74,124,126,0.1)"; }}>+</div>

              {/* Profit badge */}
              {(revenue > 0 || costs > 0) && (
                <div style={{ position: "absolute", bottom: 3, right: 4, fontFamily: "var(--font-playfair)", fontSize: "0.58rem", color: profit >= 0 ? "rgba(110,231,183,0.6)" : "rgba(248,113,113,0.6)", fontWeight: 700 }}>{fmt(profit)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CalendarClient() {
  const now = new Date();
  const [view,   setView]   = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [modalDate, setModalDate] = useState<string | null>(null);

  const qYear  = anchor.getFullYear();
  const qMonth = anchor.getMonth() + 1;

  const { data: users = [] }                    = api.calendar.users.useQuery();
  const { data: monthData = { workDays: [], financeEntries: [], guestCards: [] } } =
    api.calendar.month.useQuery({ year: qYear, month: qMonth });

  const { workDays, financeEntries, guestCards } = monthData;

  const userColors: Record<string, string> = {};
  users.forEach((u, i) => { userColors[u.id] = USER_COLORS[i % USER_COLORS.length]!; });

  const byDate: Record<string, WorkDay[]>          = {};
  const byCostDate: Record<string, FinanceEntry[]>  = {};
  const byGuestCardDate: Record<string, GuestCard[]> = {};
  workDays.forEach(w => { const k = toDateStr(new Date(w.date)); (byDate[k] ??= []).push(w as WorkDay); });
  financeEntries.forEach(e => { const k = toDateStr(new Date(e.date)); (byCostDate[k] ??= []).push(e as FinanceEntry); });
  guestCards.forEach(c => { const k = toDateStr(new Date(c.date)); (byGuestCardDate[k] ??= []).push(c as GuestCard); });

  const todayStr = toDateStr(now);

  // Monthly totals
  const userTotals: Record<string, number> = {};
  workDays.forEach(w => { userTotals[w.userId] = (userTotals[w.userId] ?? 0) + w.earnings; });
  const totalRevenue = workDays.reduce((s, w) => s + w.earnings, 0);
  const totalCosts   = financeEntries.reduce((s, e) => s + e.amount, 0);
  const totalProfit  = totalRevenue - totalCosts;

  function navigate(dir: -1 | 1) {
    setAnchor(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else if (view === "3day") d.setDate(d.getDate() + dir * 3);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }

  function navLabel() {
    if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const ws = weekStart(anchor); const we = addDays(ws, 6);
      return `${ws.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
    }
    if (view === "3day") {
      const end = addDays(anchor, 2);
      return `${anchor.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
    }
    return anchor.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  }

  function columnDays() {
    if (view === "week")  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i));
    if (view === "3day") return Array.from({ length: 3 }, (_, i) => addDays(anchor, i));
    return [anchor];
  }

  const VIEW_BTNS: { key: View; label: string }[] = [
    { key: "month", label: "Havi" }, { key: "week", label: "Heti" },
    { key: "3day",  label: "3 napos" }, { key: "day", label: "Napi" },
  ];

  const modalWorkEntries  = modalDate ? (byDate[modalDate] ?? []) : [];
  const modalCostEntries  = modalDate ? (byCostDate[modalDate] ?? []) : [];
  const modalGuestCards   = modalDate ? (byGuestCardDate[modalDate] ?? []) : [];

  return (
    <div style={{ animation: "fadeInUp 0.5s ease" }}>
      {modalDate && (
        <DayModal dateStr={modalDate} workEntries={modalWorkEntries} costEntries={modalCostEntries}
          guestCards={modalGuestCards} users={users} userColors={userColors} onClose={() => setModalDate(null)} />
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "#4a7c7e", animation: "float 4s ease-in-out infinite" }}>Munkanaptár ✦</h1>
        <p style={{ fontStyle: "italic", color: "#c45c7a", opacity: 0.75, fontFamily: "var(--font-cormorant)" }}>Ki mikor dolgozott, mennyit keresett, és mi a napi profit</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {/* View switcher */}
        <div style={{ display: "flex", background: "rgba(215,205,190,0.7)", border: "1px solid rgba(74,124,126,0.12)", borderRadius: "10px", padding: "3px", gap: "3px" }}>
          {VIEW_BTNS.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              style={{ padding: "0.42rem 0.85rem", border: "none", borderRadius: "7px", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.1em", background: view === key ? "rgba(74,124,126,0.15)" : "transparent", color: view === key ? "#4a7c7e" : "rgba(44,36,32,0.45)", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
          <button onClick={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), now.getDate()))}
            style={{ ...navBtnStyle, width: "auto", padding: "0 0.7rem", fontSize: "0.6rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>Ma</button>
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.78rem", letterSpacing: "0.1em", color: "#4a7c7e", minWidth: 190, textAlign: "center", textTransform: "capitalize" }}>{navLabel()}</span>
          <button onClick={() => navigate(1)} style={navBtnStyle}>›</button>
        </div>

        {/* Monthly summary */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {users.map((u, i) => {
            const col = USER_COLORS[i % USER_COLORS.length]!;
            const t   = userTotals[u.id] ?? 0;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.32rem 0.7rem", background: `${col}12`, border: `1px solid ${col}28`, borderRadius: "7px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: col }}>{u.name}</span>
                {t > 0 && <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.75rem", color: col, fontWeight: 700 }}>{fmt(t)}</span>}
              </div>
            );
          })}
          {totalRevenue > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.32rem 0.7rem", background: (totalProfit >= 0 ? "rgba(110,231,183," : "rgba(248,113,113,") + "0.1)", border: `1px solid ${totalProfit >= 0 ? "rgba(110,231,183,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: "7px" }}>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", color: totalProfit >= 0 ? "#6ee7b7" : "#f87171" }}>PROFIT</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: totalProfit >= 0 ? "#6ee7b7" : "#f87171", fontWeight: 700 }}>{fmt(totalProfit)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar body */}
      {view === "month" && (
        <MonthView year={qYear} month={qMonth} byDate={byDate} byCostDate={byCostDate}
          byGuestCardDate={byGuestCardDate} userColors={userColors} today={todayStr} onOpen={setModalDate} />
      )}
      {(view === "week" || view === "3day" || view === "day") && (
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {columnDays().map(date => (
            <DayColumn key={toDateStr(date)} date={date}
              workEntries={byDate[toDateStr(date)] ?? []}
              costEntries={byCostDate[toDateStr(date)] ?? []}
              guestCards={byGuestCardDate[toDateStr(date)] ?? []}
              userColors={userColors} isToday={toDateStr(date) === todayStr}
              onOpen={setModalDate} compact={view === "week"} />
          ))}
        </div>
      )}
    </div>
  );
}
