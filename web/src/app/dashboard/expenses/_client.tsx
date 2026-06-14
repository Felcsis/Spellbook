"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

const CATEGORIES = [
  "Rezsi",
  "Eszköz / gép",
  "Termék / alapanyag",
  "Szoftver / előfizetés",
  "Bérleti díj",
  "Könyvelés / admin",
  "Marketing",
  "Egyéb",
];

const CAT_COLORS: Record<string, string> = {
  "Rezsi":                "#7a9ec8",
  "Eszköz / gép":         "#c49060",
  "Termék / alapanyag":   "#7a9e8c",
  "Szoftver / előfizetés":"#a78bfa",
  "Bérleti díj":          "#e8b4c8",
  "Könyvelés / admin":    "#9278b0",
  "Marketing":            "#fbbf24",
  "Egyéb":                "#6b7280",
};

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px",
  padding: "0.7rem 1rem", color: "var(--text-primary)",
  fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.16em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

const navBtn: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px",
  color: "var(--color-teal)", fontSize: "1.2rem", width: 36, height: 36, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

export default function ExpensesClient() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);

  // Form state
  const [title,    setTitle]    = useState("");
  const [amount,   setAmount]   = useState("");
  const [date,     setDate]     = useState(() => now.toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [notes,    setNotes]    = useState("");
  const [paid,     setPaid]     = useState(true);

  const utils = api.useUtils();
  const inv = () => { void utils.expenses.list.invalidate(); };

  const { data: expenses = [], isLoading } = api.expenses.list.useQuery(
    viewMode === "month" ? { year, month } : { year },
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const create = api.expenses.create.useMutation({
    onSuccess: () => { inv(); resetForm(); setShowForm(false); setSaveError(null); },
    onError: (e) => setSaveError(e.message),
  });
  const update = api.expenses.update.useMutation({
    onSuccess: () => { inv(); setEditId(null); resetForm(); setSaveError(null); },
    onError: (e) => setSaveError(e.message),
  });
  const del    = api.expenses.delete.useMutation({ onSuccess: inv });

  function resetForm() { setTitle(""); setAmount(""); setDate(now.toISOString().slice(0, 10)); setCategory(CATEGORIES[0]!); setNotes(""); setPaid(true); }

  function openEdit(e: typeof expenses[number]) {
    setEditId(e.id);
    setTitle(e.title);
    setAmount(String(e.amount));
    setDate(new Date(e.date).toISOString().slice(0, 10));
    setCategory(e.category);
    setNotes(e.notes ?? "");
    setPaid(e.paid);
    setShowForm(false);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) return;
    if (editId) {
      update.mutate({ id: editId, title: title.trim(), amount: amt, date, category, notes: notes || undefined, paid });
    } else {
      create.mutate({ title: title.trim(), amount: amt, date, category, notes: notes || undefined, paid });
    }
  }

  function prevPeriod() { if (viewMode === "month") { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); } else setYear(y => y - 1); }
  function nextPeriod() { if (viewMode === "month") { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); } else setYear(y => y + 1); }

  const totalPaid    = expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0);
  const total        = totalPaid + totalPending;

  // Category breakdown
  const byCat: Record<string, number> = {};
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Kiadások ✦</h1>
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--color-pink)", opacity: 0.75, fontStyle: "italic", margin: "0.3rem 0 0" }}>Számlák, rezsi, eszközök és egyéb kiadások</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null); resetForm(); }}
          className="btn-gold" style={{ padding: "0.75rem 1.5rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", flexShrink: 0 }}>
          {showForm ? "Bezár" : "＋ Új kiadás"}
        </button>
      </div>

      {/* Add / Edit form */}
      {(showForm || editId) && (
        <form onSubmit={handleSubmit} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--color-teal)", textTransform: "uppercase" }}>
            {editId ? "Kiadás szerkesztése" : "Új kiadás rögzítése"}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label style={labelStyle}>Megnevezés</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="pl. Villanyszámla, Olló, Festékszett…" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <label style={labelStyle}>Összeg (Ft)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" placeholder="0" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={labelStyle}>Dátum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ ...inputStyle, colorScheme: "light" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={labelStyle}>Kategória</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcionális…" style={inputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.15rem" }}>
              <button type="button" onClick={() => setPaid(v => !v)}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: paid ? "var(--color-teal)" : "var(--bg-active)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: paid ? 20 : 2, transition: "left 0.2s" }} />
              </button>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", color: paid ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase" }}>
                {paid ? "Fizetve" : "Függőben"}
              </span>
            </div>
          </div>

          {saveError && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "0.6rem 1rem", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "#f87171" }}>
              Hiba: {saveError}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setEditId(null); setShowForm(false); resetForm(); setSaveError(null); }}
              style={{ padding: "0.6rem 1.2rem", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", cursor: "pointer" }}>
              Mégsem
            </button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-gold"
              style={{ padding: "0.6rem 1.5rem", borderRadius: 9, fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em" }}>
              {(create.isPending || update.isPending) ? "Mentés…" : editId ? "Frissítés" : "Mentés"}
            </button>
          </div>
        </form>
      )}

      {/* Navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.3rem", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 9, padding: "0.2rem" }}>
          {(["month", "year"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: "0.3rem 0.8rem", borderRadius: 7, border: "none", background: viewMode === m ? "var(--bg-active)" : "transparent", color: viewMode === m ? "var(--color-teal)" : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}>
              {m === "month" ? "Havi" : "Éves"}
            </button>
          ))}
        </div>
        <button onClick={prevPeriod} style={navBtn}>‹</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--color-teal)", minWidth: 160, textAlign: "center" }}>
          {viewMode === "month" ? `${MONTHS[month-1]} ${year}` : String(year)}
        </span>
        <button onClick={nextPeriod} style={navBtn}>›</button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div style={{ flex: "1 1 160px", background: "var(--bg-card)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(248,113,113,0.6)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Összes kiadás</div>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.4rem", color: "#f87171", fontWeight: 700 }}>{fmt(total)}</div>
        </div>
        {totalPaid > 0 && (
          <div style={{ flex: "1 1 130px", background: "var(--bg-card)", border: "1px solid rgba(122,158,140,0.25)", borderRadius: 14, padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(122,158,140,0.6)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Fizetve</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "#7a9e8c", fontWeight: 700 }}>{fmt(totalPaid)}</div>
          </div>
        )}
        {totalPending > 0 && (
          <div style={{ flex: "1 1 130px", background: "var(--bg-card)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 14, padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(251,191,36,0.6)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Függőben</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "#fbbf24", fontWeight: 700 }}>{fmt(totalPending)}</div>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {sortedCats.length > 0 && (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", color: "rgba(122,158,140,0.5)", textTransform: "uppercase", marginBottom: "0.85rem" }}>Kategóriánként</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {sortedCats.map(([cat, amt]) => {
              const col = CAT_COLORS[cat] ?? "#6b7280";
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", minWidth: 160 }}>{cat}</span>
                  <div style={{ flex: 1, height: 8, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, opacity: 0.6, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: col, fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmt(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: "var(--color-teal)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>Ebben az időszakban nincsenek kiadások</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {expenses.map(e => {
            const col = CAT_COLORS[e.category] ?? "#6b7280";
            const isEditing = editId === e.id;
            return (
              <div key={e.id} style={{ background: "var(--bg-panel)", border: `1px solid ${isEditing ? col + "66" : col + "22"}`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 600 }}>{e.title}</div>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.1em", color: col, padding: "0.1rem 0.4rem", border: `1px solid ${col}44`, borderRadius: 4, textTransform: "uppercase" }}>{e.category}</span>
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-muted)" }}>{new Date(e.date).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}</span>
                    {!e.paid && <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.08em", color: "#fbbf24", padding: "0.1rem 0.4rem", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 4 }}>FÜGGŐBEN</span>}
                    {e.notes && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)", fontStyle: "italic" }}>{e.notes}</span>}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: "#f87171", fontWeight: 700, flexShrink: 0 }}>{fmt(e.amount)}</span>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button onClick={() => isEditing ? (setEditId(null), resetForm()) : openEdit(e)}
                    style={{ background: "none", border: "none", color: isEditing ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.35rem", borderRadius: 5, transition: "color 0.2s" }}
                    title="Szerkesztés">✎</button>
                  <button onClick={() => { if (confirm("Törlöd ezt a kiadást?")) del.mutate({ id: e.id }); }}
                    style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.35rem", borderRadius: 5, transition: "color 0.2s" }}
                    onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
                    title="Törlés">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
