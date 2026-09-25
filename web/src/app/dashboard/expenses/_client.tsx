"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toDateStr } from "~/lib/date";

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

const CATEGORIES = [
  "Rezsi",
  "Eszköz / gép",
  "Termék / alapanyag",
  "Szoftver / előfizetés",
  "Bérleti díj",
  "Könyvelés / admin",
  "Adó / járulék",
  "Marketing",
  "Egyéb",
];

// Szolgáltatáson kívüli bevétel — bér nem számolódik belőle, a nyereséghez adódik.
const INCOME_CATEGORIES = ["Székbérlet", "Egyéb bevétel"];
const INCOME_COLOR = "#527666";

type Kind = "expense" | "income";

const CAT_COLORS: Record<string, string> = {
  "Székbérlet":           INCOME_COLOR,
  "Egyéb bevétel":        "#7a9e8c",
  "Rezsi":                "#7a9ec8",
  "Eszköz / gép":         "#c49060",
  "Termék / alapanyag":   "#7a9e8c",
  "Szoftver / előfizetés":"#a78bfa",
  "Bérleti díj":          "#e8b4c8",
  "Könyvelés / admin":    "#9278b0",
  "Adó / járulék":        "#d4a373",
  "Marketing":            "var(--color-warn)",
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

export default function ExpensesClient({ isAdmin = false, userId = "" }: { isAdmin?: boolean; userId?: string }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);

  // Form state
  const [title,        setTitle]        = useState("");
  const [amount,       setAmount]       = useState("");
  const [date,         setDate]         = useState(() => toDateStr(now));
  const [category,     setCategory]     = useState(CATEGORIES[0]!);
  const [notes,        setNotes]        = useState("");
  const [paid,         setPaid]         = useState(true);
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [recurring,    setRecurring]    = useState(false);
  const [kind,         setKind]         = useState<Kind>("expense");
  const isIncome = kind === "income";
  const cats = isIncome ? INCOME_CATEGORIES : CATEGORIES;

  const utils = api.useUtils();
  const inv = () => { void utils.expenses.list.invalidate(); void utils.expenses.recurringList.invalidate(); };

  const { data: users = [] } = api.admin.listStaff.useQuery(undefined, { enabled: isAdmin });

  const { data: expenses = [], isLoading, error: listError } = api.expenses.list.useQuery(
    viewMode === "month" ? { year, month } : { year },
  );
  const { data: incomes = [] } = api.expenses.list.useQuery(
    viewMode === "month" ? { year, month, kind: "income" } : { year, kind: "income" },
    { enabled: isAdmin },
  );
  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);

  const visibleExpenses = isAdmin ? expenses : expenses.filter(e =>
    (e.assignedTo?.id ?? e.createdBy?.id) === userId
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
  const setPaidMut = api.expenses.setPaid.useMutation({ onSuccess: inv });
  const createRecurring = api.expenses.recurringCreate.useMutation({
    onSuccess: () => { inv(); resetForm(); setShowForm(false); setSaveError(null); },
    onError: (e) => setSaveError(e.message),
  });

  function resetForm() { setTitle(""); setAmount(""); setDate(toDateStr(now)); setCategory(CATEGORIES[0]!); setNotes(""); setPaid(true); setAssignedToId(""); setRecurring(false); setKind("expense"); }

  function openEdit(e: typeof expenses[number]) {
    setEditId(e.id);
    setKind(e.kind === "income" ? "income" : "expense");
    setTitle(e.title);
    setAmount(String(e.amount));
    setDate(toDateStr(new Date(e.date)));
    setCategory(e.category);
    setNotes(e.notes ?? "");
    setPaid(e.paid);
    setAssignedToId(e.assignedTo?.id ?? "");
    setShowForm(false);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) return;
    const assignedId = isAdmin ? (assignedToId || undefined) : userId;
    if (!editId && recurring) {
      createRecurring.mutate({ title: title.trim(), amount: amt, startDate: date, category, kind, notes: notes || undefined, assignedToId: assignedId });
    } else if (editId) {
      update.mutate({ id: editId, title: title.trim(), amount: amt, date, category, notes: notes || undefined, paid, assignedToId: assignedId ?? null });
    } else {
      create.mutate({ title: title.trim(), amount: amt, date, category, kind, notes: notes || undefined, paid, assignedToId: assignedId });
    }
  }

  function prevPeriod() { if (viewMode === "month") { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); } else setYear(y => y - 1); }
  function nextPeriod() { if (viewMode === "month") { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); } else setYear(y => y + 1); }

  const totalPaid    = visibleExpenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
  const totalPending = visibleExpenses.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0);
  const total        = totalPaid + totalPending;

  // Category breakdown
  const byCat: Record<string, number> = {};
  visibleExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  // Per-user breakdown — admin only
  const byUserId: Record<string, { name: string; amount: number }> = {};
  users.forEach(u => { byUserId[u.id] = { name: u.name ?? "?", amount: 0 }; });
  visibleExpenses.forEach(e => {
    const uid = e.assignedTo?.id ?? e.createdBy?.id;
    const uname = e.assignedTo?.name ?? e.createdBy?.name ?? "Ismeretlen";
    if (uid) {
      if (!byUserId[uid]) byUserId[uid] = { name: uname, amount: 0 };
      byUserId[uid]!.amount += e.amount;
    }
  });
  const sortedUsers = Object.values(byUserId).sort((a, b) => b.amount - a.amount);
  const USER_COLORS = ["#e8b4c8", "#7a9ec8", "#c49060", "#7a9e8c"];

  function renderRow(e: typeof expenses[number]) {
    const income = e.kind === "income";
            const col = CAT_COLORS[e.category] ?? (income ? INCOME_COLOR : "#6b7280");
            const isEditing = editId === e.id;
            return (
              <div key={e.id} style={{ background: "var(--bg-panel)", border: `1px solid ${isEditing ? col + "66" : col + "22"}`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 600 }}>{e.title}</div>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                    <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.1em", color: col, padding: "0.1rem 0.4rem", border: `1px solid ${col}44`, borderRadius: 4, textTransform: "uppercase" }}>{e.category}</span>
                    <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-muted)" }}>{new Date(e.date).toLocaleDateString("hu-HU", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })}</span>
                    {!e.paid && (
                      <button onClick={() => setPaidMut.mutate({ id: e.id, paid: true })} title={income ? "Megérkezett" : "Fizetettnek jelölöm"}
                        style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.08em", color: "var(--color-warn)", padding: "0.1rem 0.4rem", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 4, background: "none", cursor: "pointer" }}>
                        {income ? "VÁRJUK · MEGJÖTT ✓" : "FÜGGŐBEN · KIFIZETVE ✓"}
                      </button>
                    )}
                    {e.recurringId && <span title="Havonta ismétlődő" style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.08em", color: "var(--color-teal)", padding: "0.1rem 0.4rem", border: "1px solid var(--border)", borderRadius: 4 }}>↻ HAVI</span>}
                    {e.assignedTo && <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.08em", color: "#e8b4c8", padding: "0.1rem 0.4rem", border: "1px solid rgba(232,180,200,0.35)", borderRadius: 4 }}>👤 {e.assignedTo.name}</span>}
                    {e.notes && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--text-soft)", fontStyle: "italic" }}>{e.notes}</span>}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.05rem", color: income ? INCOME_COLOR : "var(--color-danger)", fontWeight: 700, flexShrink: 0 }}>{income ? "+" : ""}{fmt(e.amount)}</span>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button onClick={() => isEditing ? (setEditId(null), resetForm()) : openEdit(e)}
                    style={{ background: "none", border: "none", color: isEditing ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.35rem", borderRadius: 5, transition: "color 0.2s" }}
                    title="Szerkesztés">✎</button>
                  <button onClick={() => { if (confirm(income ? "Törlöd ezt a bevételt?" : "Törlöd ezt a kiadást?")) del.mutate({ id: e.id }); }}
                    style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.35rem", borderRadius: 5, transition: "color 0.2s" }}
                    onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.color = "var(--color-danger)"; }}
                    onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
                    title="Törlés">✕</button>
                </div>
              </div>
            );
  }

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>{isAdmin ? "Kiadások/Bevételek" : "Kiadások"} ✦</h1>
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--color-pink)", opacity: 0.75, fontStyle: "italic", margin: "0.3rem 0 0" }}>{isAdmin ? "Számlák, rezsi, eszközök — és a székbérlet" : "Számlák, rezsi, eszközök és egyéb kiadások"}</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null); resetForm(); }}
          className="btn-gold" style={{ padding: "0.75rem 1.5rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", flexShrink: 0 }}>
          {showForm ? "Bezár" : isAdmin ? "＋ Új tétel" : "＋ Új kiadás"}
        </button>
      </div>

      {/* Add / Edit form */}
      {(showForm || editId) && (
        <form onSubmit={handleSubmit} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--color-teal)", textTransform: "uppercase" }}>
            {editId ? (isIncome ? "Bevétel szerkesztése" : "Kiadás szerkesztése") : (isIncome ? "Új bevétel rögzítése" : "Új kiadás rögzítése")}
          </div>

          {isAdmin && !editId && (
            <div style={{ display: "flex", gap: "0.3rem", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 9, padding: "0.2rem", alignSelf: "flex-start" }}>
              {(["expense", "income"] as const).map(k => (
                <button key={k} type="button" onClick={() => { setKind(k); setCategory((k === "income" ? INCOME_CATEGORIES : CATEGORIES)[0]!); }}
                  style={{ padding: "0.35rem 0.9rem", borderRadius: 7, border: "none", background: kind === k ? "var(--bg-active)" : "transparent", color: kind === k ? (k === "income" ? INCOME_COLOR : "var(--color-danger)") : "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.1em", cursor: "pointer" }}>
                  {k === "income" ? "＋ Bevétel (pl. székbérlet)" : "− Kiadás"}
                </button>
              ))}
            </div>
          )}

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
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isAdmin && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelStyle}>{isIncome ? "Kitől" : "Kinek szól"}</label>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} style={{ ...inputStyle }}>
                <option value="">— Általános —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name ?? "?"}</option>)}
              </select>
            </div>
            )}
            <div style={{ flex: 2, minWidth: 160 }}>
              <label style={labelStyle}>Megjegyzés</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcionális…" style={inputStyle} />
            </div>
            {!editId && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.15rem" }}>
                <button type="button" onClick={() => setRecurring(v => !v)}
                  style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: recurring ? "var(--color-teal)" : "var(--bg-active)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: recurring ? 20 : 2, transition: "left 0.2s" }} />
                </button>
                <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", color: recurring ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase" }}>
                  ↻ Havonta
                </span>
              </div>
            )}
            {!recurring && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.15rem" }}>
              <button type="button" onClick={() => setPaid(v => !v)}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: paid ? "var(--color-teal)" : "var(--bg-active)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: paid ? 20 : 2, transition: "left 0.2s" }} />
              </button>
              <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", color: paid ? "var(--color-teal)" : "var(--text-muted)", textTransform: "uppercase" }}>
                {isIncome ? (paid ? "Megérkezett" : "Várjuk") : (paid ? "Fizetve" : "Függőben")}
              </span>
            </div>
            )}
          </div>

          {!editId && recurring && (
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              {isIncome
                ? <>Minden hónap {Number(date.slice(8, 10))}. napján magától bekerül „várjuk” jelöléssel — ha megjött, egy kattintással megérkezettre állítod. Az első a dátumnál megadott nap.</>
                : <>Minden hónap {Number(date.slice(8, 10))}. napján magától bekerül „függőben” jelöléssel — ha más lett az összeg, átírod, és fizetettre állítod. Az első a dátumnál megadott nap.</>}
            </div>
          )}

          {saveError && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "0.6rem 1rem", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: "var(--color-danger)" }}>
              Hiba: {saveError}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setEditId(null); setShowForm(false); resetForm(); setSaveError(null); }}
              style={{ padding: "0.6rem 1.2rem", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", cursor: "pointer" }}>
              Mégsem
            </button>
            <button type="submit" disabled={create.isPending || update.isPending || createRecurring.isPending} className="btn-gold"
              style={{ padding: "0.6rem 1.5rem", borderRadius: 9, fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.15em" }}>
              {(create.isPending || update.isPending || createRecurring.isPending) ? "Mentés…" : editId ? "Frissítés" : "Mentés"}
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
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.4rem", color: "var(--color-danger)", fontWeight: 700 }}>{fmt(total)}</div>
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
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: "var(--color-warn)", fontWeight: 700 }}>{fmt(totalPending)}</div>
          </div>
        )}
        {totalIncome > 0 && (
          <div style={{ flex: "1 1 130px", background: "var(--bg-card)", border: "1px solid rgba(82,118,102,0.3)", borderRadius: 14, padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(82,118,102,0.7)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Egyéb bevétel</div>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.15rem", color: INCOME_COLOR, fontWeight: 700 }}>+{fmt(totalIncome)}</div>
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

      {/* Per-user breakdown — admin only */}
      {isAdmin && users.length > 0 && (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", color: "rgba(122,158,140,0.5)", textTransform: "uppercase", marginBottom: "0.85rem" }}>Felhasználónként</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {sortedUsers.map(({ name, amount: amt }, i) => {
              const col = USER_COLORS[i % USER_COLORS.length]!;
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", minWidth: 160 }}>{name}</span>
                  <div style={{ flex: 1, height: 8, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, opacity: 0.7, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.88rem", color: col, fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmt(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {incomes.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", color: INCOME_COLOR, textTransform: "uppercase", marginBottom: "0.6rem" }}>Egyéb bevételek</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {incomes.map(e => renderRow(e))}
          </div>
        </div>
      )}

      <RecurringPanel isAdmin={isAdmin} userId={userId} users={users} onChange={inv} />

      {/* List */}
      {listError && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", fontFamily: "var(--font-cormorant)", color: "var(--color-danger)", fontSize: "0.95rem" }}>
          Hiba a kiadások betöltésekor: {listError.message}
        </div>
      )}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", padding: "3rem", fontStyle: "italic" }}>Betöltés...</div>
      ) : visibleExpenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: "var(--color-teal)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>Ebben az időszakban nincsenek kiadások</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {visibleExpenses.map(e => renderRow(e))}
        </div>
      )}
    </div>
  );
}

// ── Havonta ismétlődő kiadások ────────────────────────────────────────────

function RecurringPanel({ isAdmin, userId, users, onChange }: {
  isAdmin: boolean; userId: string;
  users: { id: string; name: string | null }[];
  onChange: () => void;
}) {
  const { data: all = [] } = api.expenses.recurringList.useQuery();
  const list = isAdmin ? all : all.filter(r => (r.assignedToId ?? r.createdById) === userId);
  const upd = api.expenses.recurringUpdate.useMutation({ onSuccess: () => { onChange(); setEditId(null); } });
  const del = api.expenses.recurringDelete.useMutation({ onSuccess: onChange });

  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eDay, setEDay] = useState("");
  const [eCat, setECat] = useState("");
  const [eWho, setEWho] = useState("");

  if (list.length === 0) return null;

  const small: React.CSSProperties = { ...inputStyle, padding: "0.4rem 0.6rem", fontSize: "0.95rem" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0.2rem 0.35rem", borderRadius: 5 };

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.18em", color: "rgba(122,158,140,0.5)", textTransform: "uppercase", marginBottom: "0.85rem" }}>↻ Havonta ismétlődő</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {list.map(r => {
          const income = r.kind === "income";
          const col = CAT_COLORS[r.category] ?? (income ? INCOME_COLOR : "#6b7280");
          if (editId === r.id) {
            return (
              <form key={r.id} onSubmit={ev => {
                  ev.preventDefault();
                  const amt = parseFloat(eAmount), day = parseInt(eDay, 10);
                  if (!eTitle.trim() || isNaN(amt) || amt <= 0 || !(day >= 1 && day <= 31)) return;
                  upd.mutate({ id: r.id, title: eTitle.trim(), amount: amt, dayOfMonth: day, category: eCat, ...(isAdmin && { assignedToId: eWho || null }) });
                }}
                style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <input value={eTitle} onChange={e => setETitle(e.target.value)} style={{ ...small, flex: "2 1 140px", width: "auto" }} />
                <input type="number" value={eAmount} onChange={e => setEAmount(e.target.value)} min="1" style={{ ...small, flex: "1 1 90px", width: "auto" }} title="Összeg (Ft)" />
                <input type="number" value={eDay} onChange={e => setEDay(e.target.value)} min="1" max="31" style={{ ...small, flex: "0 0 70px", width: 70 }} title="A hónap napja" />
                <select value={eCat} onChange={e => setECat(e.target.value)} style={{ ...small, flex: "1 1 130px", width: "auto" }}>
                  {(income ? INCOME_CATEGORIES : CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {isAdmin && (
                  <select value={eWho} onChange={e => setEWho(e.target.value)} style={{ ...small, flex: "1 1 110px", width: "auto" }}>
                    <option value="">— Általános —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name ?? "?"}</option>)}
                  </select>
                )}
                <button type="submit" className="btn-gold" disabled={upd.isPending} style={{ padding: "0.4rem 0.9rem", borderRadius: 8, fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em" }}>Mentés</button>
                <button type="button" onClick={() => setEditId(null)} style={iconBtn}>Mégsem</button>
              </form>
            );
          }
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", opacity: r.active ? 1 : 0.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 600 }}>{r.title}</span>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.6rem" }}>
                  {r.active
                    ? `minden hó ${r.dayOfMonth}. · következő: ${new Date(r.nextDue).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "long", day: "numeric" })}`
                    : "szünetel"}
                  {r.assignedTo && ` · ${income ? "kitől: " : ""}${r.assignedTo.name}`}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: income ? INCOME_COLOR : "var(--color-danger)", fontWeight: 700 }}>{income ? "+" : ""}{fmt(r.amount)}</span>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button title="Szerkesztés" style={iconBtn} onClick={() => {
                  setEditId(r.id); setETitle(r.title); setEAmount(String(r.amount)); setEDay(String(r.dayOfMonth)); setECat(r.category); setEWho(r.assignedToId ?? "");
                }}>✎</button>
                <button title={r.active ? "Szüneteltetés" : "Folytatás"} style={iconBtn}
                  onClick={() => upd.mutate({ id: r.id, active: !r.active })}>{r.active ? "⏸" : "▶"}</button>
                <button title="Törlés" style={iconBtn}
                  onClick={() => { if (confirm(`Törlöd a(z) „${r.title}” ismétlődést? A már rögzített kiadások megmaradnak.`)) del.mutate({ id: r.id }); }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
