"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { useIsMobile } from "~/app/_responsive";

const USER_COLORS: Record<string, string> = {
  Felicia: "#c9906a",
  Gitta:   "#9878b8",
  Lili:    "#e8a0b8",
};
function userColor(name: string | null | undefined) {
  return USER_COLORS[name ?? ""] ?? "var(--color-teal)";
}

const ROLE_LABELS: Record<string, string> = { admin: "Admin", staff: "Staff" };

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: "2rem", minWidth: 360, maxWidth: 480, width: "100%", boxShadow: "0 8px 48px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1.1rem", color: "var(--color-teal)", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem", fontFamily: "var(--font-cormorant)", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8,
        background: "var(--bg-input, var(--bg-sidebar))", border: "1px solid var(--border)",
        color: "var(--text-primary)", fontSize: "0.95rem", boxSizing: "border-box",
        outline: "none", fontFamily: "var(--font-cormorant)",
        ...props.style,
      }}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8,
        background: "var(--bg-input, var(--bg-sidebar))", border: "1px solid var(--border)",
        color: "var(--text-primary)", fontSize: "0.95rem", boxSizing: "border-box",
        outline: "none", fontFamily: "var(--font-cormorant)",
        ...props.style,
      }}
    >
      {props.children}
    </select>
  );
}

function Btn({ onClick, children, variant = "primary", disabled }: { onClick?: () => void; children: React.ReactNode; variant?: "primary" | "ghost" | "danger"; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { padding: "0.5rem 1.2rem", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem" },
    ghost:   { padding: "0.5rem 1.2rem", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem" },
    danger:  { padding: "0.5rem 1.2rem", borderRadius: 8, border: "1px solid #e05555", background: "rgba(224,85,85,0.12)", color: "#e05555", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem" },
  };
  return (
    <button onClick={onClick} disabled={disabled} className={variant === "primary" ? "btn-gold" : undefined} style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]       = useState<"admin" | "staff">("staff");
  const [err, setErr]         = useState("");

  const create = api.admin.createUser.useMutation({
    onSuccess: () => { onCreated(); onClose(); },
    onError:   e  => setErr(e.message),
  });

  return (
    <Modal title="Új felhasználó" onClose={onClose}>
      <Field label="Név"><Input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Zsófi" /></Field>
      <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="zsofi@salon-spellbook.local" /></Field>
      <Field label="Jelszó"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 4 karakter" /></Field>
      <Field label="Szerepkör">
        <Select value={role} onChange={e => setRole(e.target.value as "admin" | "staff")}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      {err && <p style={{ color: "#e05555", fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</p>}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Mégse</Btn>
        <Btn onClick={() => create.mutate({ name, email, password, role })} disabled={!name || !email || !password || create.isPending}>
          {create.isPending ? "Mentés…" : "Létrehozás"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }: {
  user: { id: string; name: string | null; email: string | null; role: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]   = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole]   = useState<"admin" | "staff">(user.role as "admin" | "staff");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");

  const update = api.admin.updateUser.useMutation({ onSuccess: () => { onSaved(); onClose(); }, onError: e => setErr(e.message) });
  const changePw = api.admin.changePassword.useMutation({ onSuccess: () => setPw(""), onError: e => setErr(e.message) });

  return (
    <Modal title={`Szerkesztés — ${user.name}`} onClose={onClose}>
      <Field label="Név"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Szerepkör">
        <Select value={role} onChange={e => setRole(e.target.value as "admin" | "staff")}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <div style={{ borderTop: "1px solid var(--border)", margin: "1rem 0", paddingTop: "1rem" }}>
        <Field label="Új jelszó (opcionális)">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="min. 4 karakter" />
            <Btn onClick={() => changePw.mutate({ id: user.id, password: pw })} disabled={pw.length < 4 || changePw.isPending} variant="ghost">
              {changePw.isPending ? "…" : "Csere"}
            </Btn>
          </div>
        </Field>
      </div>
      {err && <p style={{ color: "#e05555", fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</p>}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Mégse</Btn>
        <Btn onClick={() => update.mutate({ id: user.id, name, email, role })} disabled={update.isPending}>
          {update.isPending ? "Mentés…" : "Mentés"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }: {
  user: { id: string; name: string | null };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const del = api.admin.deleteUser.useMutation({ onSuccess: () => { onDeleted(); onClose(); } });
  return (
    <Modal title="Törlés megerősítése" onClose={onClose}>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontFamily: "var(--font-cormorant)", fontSize: "1.05rem" }}>
        Biztosan törlöd <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong> felhasználóját? Ez visszavonhatatlan.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Mégse</Btn>
        <Btn variant="danger" onClick={() => del.mutate({ id: user.id })} disabled={del.isPending}>
          {del.isPending ? "Törlés…" : "Törlés"}
        </Btn>
      </div>
    </Modal>
  );
}

type UserRow = { id: string; name: string | null; email: string | null; role: string };

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const fmt = (n: number) => new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

// ── Staff finances section ────────────────────────────────────────────────────
function StaffFinances({ users }: { users: UserRow[] }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: entries = [] } = api.admin.staffFinances.useQuery({ year, month });

  const staff = users.filter(u => u.role !== "admin");

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const byUser = (userId: string) => entries.filter(e =>
    e.workDay ? e.workDay.userId === userId : e.createdBy.id === userId
  );

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
        <button onClick={prevMonth} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--color-teal)", width: 34, height: 34, cursor: "pointer", fontSize: "1rem" }}>‹</button>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", letterSpacing: "0.16em", color: "var(--text-primary)", minWidth: 160, textAlign: "center" }}>{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--color-teal)", width: 34, height: 34, cursor: "pointer", fontSize: "1rem" }}>›</button>
      </div>

      {/* Per-staff cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {staff.map(u => {
          const uc      = userColor(u.name);
          const uEntries = byUser(u.id);
          const revenue  = uEntries.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
          const material = uEntries.filter(e => e.type === "material").reduce((s, e) => s + e.amount, 0);
          const wageActual = uEntries.filter(e => e.type === "wage").reduce((s, e) => s + e.amount, 0);
          const wage       = wageActual > 0 ? wageActual : Math.round(revenue * 0.6);
          const net        = revenue - material - wageActual;
          const revenueEntries = uEntries.filter(e => e.type === "revenue");

          return (
            <div key={u.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${uc}`, borderRadius: 14, overflow: "hidden" }}>
              {/* Worker header */}
              <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `radial-gradient(circle, ${uc}44, ${uc}22)`, border: `2px solid ${uc}66`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.95rem", color: uc, flexShrink: 0 }}>
                  {(u.name ?? "?")[0]}
                </div>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", color: uc, fontWeight: 600, flex: 1 }}>{u.name}</span>
                <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", color: net >= 0 ? "var(--color-teal)" : "#f87171", fontWeight: 700 }}>{fmt(net)}</div>
              </div>

              {/* Summary row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--bg-highlight)" }}>
                {[
                  { label: "Bevétel", value: revenue, color: "var(--color-teal)" },
                  { label: "Anyagköltség", value: material, color: "#c4926e" },
                  { label: wageActual > 0 ? "Bér" : "Várható bér (60%)", value: wage, color: "#9878b8" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: "0.7rem 1.1rem", borderRight: "1px solid var(--bg-highlight)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color, fontWeight: 700 }}>{fmt(value)}</div>
                  </div>
                ))}
              </div>

              {/* Entry list */}
              {revenueEntries.length > 0 && (
                <div style={{ borderTop: "1px solid var(--bg-highlight)" }}>
                  {revenueEntries.map(e => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--bg-highlight)" }}>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 80 }}>
                        {new Date(e.date).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "numeric", day: "numeric" })}
                      </span>
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--text-primary)", flex: 1 }}>{e.description}</span>
                      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {uEntries.length === 0 && (
                <div style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-cormorant)", color: "var(--text-muted)", fontSize: "0.95rem", borderTop: "1px solid var(--bg-highlight)", textAlign: "center" }}>
                  Nincs bejegyzés ebben a hónapban
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminClient() {
  const isMobile = useIsMobile();
  const { data: users = [], refetch } = api.admin.listUsers.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [tab, setTab] = useState<"users" | "finances">("users");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "none", cursor: "pointer",
    fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em",
    background: active ? "var(--bg-active)" : "transparent",
    color: active ? "var(--color-teal)" : "var(--text-muted)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1.5rem", color: "var(--color-teal)", margin: 0 }}>
          ✦ Admin felület
        </h1>
        {tab === "users" && <Btn onClick={() => setShowCreate(true)}>+ Új felhasználó</Btn>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", background: "var(--bg-panel)", padding: "0.25rem", borderRadius: 10, width: "fit-content" }}>
        <button style={tabStyle(tab === "users")}   onClick={() => setTab("users")}>Felhasználók</button>
        <button style={tabStyle(tab === "finances")} onClick={() => setTab("finances")}>Pénzügyek</button>
      </div>

      {tab === "finances" && <StaffFinances users={users} />}

      {/* User cards */}
      {tab === "users" && <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {users?.map(u => {
          const uc = userColor(u.name);
          return (
            <div
              key={u.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${uc}`,
                borderRadius: 12,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: `radial-gradient(circle, ${uc}44, ${uc}22)`,
                border: `2px solid ${uc}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-cinzel)", fontSize: "1rem", color: uc,
              }}>
                {(u.name ?? "?")[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: isMobile ? "calc(100% - 3.5rem)" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: uc, fontWeight: 600 }}>
                    {u.name}
                  </span>
                  <span style={{
                    fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 20,
                    background: u.role === "admin" ? "rgba(201,144,106,0.15)" : "rgba(120,180,160,0.12)",
                    color: u.role === "admin" ? "#c9906a" : "var(--color-teal)",
                    border: `1px solid ${u.role === "admin" ? "#c9906a44" : "var(--border)"}`,
                    fontFamily: "var(--font-cinzel)", letterSpacing: "0.08em",
                  }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginTop: "0.1rem" }}>{u.email}</div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginLeft: isMobile ? "auto" : undefined }}>
                <button
                  onClick={() => setEditUser(u)}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.8rem", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", fontFamily: "var(--font-cormorant)" }}
                >
                  Szerkesztés
                </button>
                <button
                  onClick={() => setDeleteUser(u)}
                  style={{ background: "none", border: "1px solid #e0555533", borderRadius: 8, padding: "0.35rem 0.8rem", color: "#e05555", cursor: "pointer", fontSize: "0.85rem", fontFamily: "var(--font-cormorant)" }}
                >
                  Törlés
                </button>
              </div>
            </div>
          );
        })}
      </div>}

      {/* Modals */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => void refetch()} />}
      {editUser   && <EditUserModal   user={editUser}   onClose={() => setEditUser(null)}   onSaved={() => void refetch()} />}
      {deleteUser && <DeleteModal     user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={() => void refetch()} />}
    </div>
  );
}
