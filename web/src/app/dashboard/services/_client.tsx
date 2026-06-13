"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// ── Types ──────────────────────────────────────────────────────────────────
type Service = {
  id: string; name: string; price: number; duration: number;
  description: string | null; active: boolean; order: number;
};
type Category = {
  id: string; name: string; order: number; services: Service[];
};

// ── Style helpers ──────────────────────────────────────────────────────────
const gold   = "var(--color-teal)";
const cream  = "var(--text-primary)";
const dimmed = "var(--text-soft)";
const panelBg = "rgba(20,12,40,0.6)";
const border  = "1px solid var(--border)";

// ── Inline modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "rgba(14,8,28,0.97)", border, borderRadius: 14, padding: "2rem", width: 420, maxWidth: "calc(100vw - 2rem)", boxShadow: "0 0 40px rgba(124,58,237,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: dimmed, marginBottom: "0.3rem", letterSpacing: "0.06em" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 8,
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: cream, fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

function Btn({ onClick, children, variant = "primary", disabled }: { onClick: () => void; children: React.ReactNode; variant?: "primary" | "ghost" | "danger"; disabled?: boolean }) {
  const bg: Record<string, string> = {
    primary: "linear-gradient(135deg, rgba(196,92,122,0.5), var(--border))",
    ghost:   "var(--bg-today)",
    danger:  "rgba(220,50,50,0.15)",
  };
  const col: Record<string, string> = { primary: cream, ghost: dimmed, danger: "rgba(255,100,100,0.85)" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "0.5rem 1.1rem", borderRadius: 8, border, background: bg[variant], color: col[variant], fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s" }}
    >
      {children}
    </button>
  );
}

// ── Add / edit service modal ───────────────────────────────────────────────
function ServiceModal({ categoryId, service, onClose }: { categoryId: string; service?: Service; onClose: () => void }) {
  const utils = api.useUtils();
  const [name, setName]   = useState(service?.name ?? "");
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [dur, setDur]     = useState(service?.duration?.toString() ?? "30");
  const [desc, setDesc]   = useState(service?.description ?? "");

  const create = api.services.createService.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); } });
  const update = api.services.updateService.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); } });

  const save = () => {
    const p = parseFloat(price);
    const d = parseInt(dur);
    if (!name.trim() || isNaN(p) || isNaN(d)) return;
    if (service) {
      update.mutate({ id: service.id, name, price: p, duration: d, description: desc || undefined });
    } else {
      create.mutate({ categoryId, name, price: p, duration: d, description: desc || undefined });
    }
  };

  return (
    <Modal title={service ? "Szolgáltatás szerkesztése" : "Új szolgáltatás"} onClose={onClose}>
      <Field label="Megnevezés">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="pl. Hajvágás" autoFocus />
      </Field>
      <Field label="Ár (Ft)">
        <input style={inputStyle} type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="pl. 5000" />
      </Field>
      <Field label="Időtartam (perc)">
        <input style={inputStyle} type="number" value={dur} onChange={e => setDur(e.target.value)} placeholder="30" />
      </Field>
      <Field label="Megjegyzés (opcionális)">
        <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="rövid leírás..." />
      </Field>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <Btn variant="ghost" onClick={onClose}>Mégsem</Btn>
        <Btn onClick={save} disabled={create.isPending || update.isPending}>Mentés</Btn>
      </div>
    </Modal>
  );
}

// ── Add category modal ─────────────────────────────────────────────────────
function CategoryModal({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const create = api.services.createCategory.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); } });
  return (
    <Modal title="Új kategória" onClose={onClose}>
      <Field label="Kategória neve">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="pl. Hajkezelések" autoFocus onKeyDown={e => e.key === "Enter" && create.mutate({ name })} />
      </Field>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <Btn variant="ghost" onClick={onClose}>Mégsem</Btn>
        <Btn onClick={() => create.mutate({ name })} disabled={!name.trim() || create.isPending}>Létrehozás</Btn>
      </div>
    </Modal>
  );
}

// ── Service row ────────────────────────────────────────────────────────────
function ServiceRow({ svc, onEdit, isAdmin }: { svc: Service; onEdit: () => void; isAdmin: boolean }) {
  const utils = api.useUtils();
  const del    = api.services.deleteService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });
  const toggle = api.services.updateService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.7rem 1rem", borderRadius: 8,
        background: svc.active ? "var(--bg-today)" : "var(--bg-panel)",
        border: "1px solid var(--bg-highlight)",
        opacity: svc.active ? 1 : 0.5,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ flex: 1, fontFamily: "var(--font-cormorant)", color: svc.active ? cream : dimmed, fontSize: "1rem" }}>
        {svc.name}
        {svc.description && <span style={{ marginLeft: "0.5rem", fontSize: "0.82rem", color: dimmed }}>{svc.description}</span>}
      </div>
      <div style={{ fontFamily: "var(--font-cormorant)", color: gold, fontSize: "1rem", minWidth: 80, textAlign: "right" }}>
        {svc.price.toLocaleString("hu-HU")} Ft
      </div>
      <div style={{ fontSize: "0.8rem", color: dimmed, minWidth: 60, textAlign: "right" }}>
        {svc.duration} perc
      </div>
      {isAdmin && (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => toggle.mutate({ id: svc.id, active: !svc.active })} title={svc.active ? "Inaktiválás" : "Aktiválás"} style={{ background: "none", border: "none", cursor: "pointer", color: svc.active ? gold : dimmed, fontSize: "1rem" }}>
            {svc.active ? "✦" : "✧"}
          </button>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: dimmed, fontSize: "0.9rem" }}>✎</button>
          <button onClick={() => { if (confirm(`Törlöd: „${svc.name}"?`)) del.mutate({ id: svc.id }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.6)", fontSize: "0.9rem" }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Category block ─────────────────────────────────────────────────────────
function CategoryBlock({ cat, isAdmin }: { cat: Category; isAdmin: boolean }) {
  const utils = api.useUtils();
  const [addSvc, setAddSvc]   = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal]   = useState(cat.name);

  const delCat    = api.services.deleteCategory.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });
  const updateCat = api.services.updateCategory.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); setEditName(false); } });

  return (
    <div style={{ background: panelBg, border, borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", backdropFilter: "blur(12px)" }}>
      {/* Category header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {editName ? (
          <input
            style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-cinzel)", fontSize: "0.95rem" }}
            value={nameVal}
            autoFocus
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") updateCat.mutate({ id: cat.id, name: nameVal }); if (e.key === "Escape") setEditName(false); }}
            onBlur={() => { if (nameVal.trim() && nameVal !== cat.name) updateCat.mutate({ id: cat.id, name: nameVal }); else setEditName(false); }}
          />
        ) : (
          <span
            style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.95rem", color: gold, letterSpacing: "0.1em", cursor: "pointer", flex: 1 }}
            onDoubleClick={() => setEditName(true)}
            title="Duplaklikk a szerkesztéshez"
          >
            {cat.name}
          </span>
        )}
        <span style={{ fontSize: "0.8rem", color: dimmed }}>{cat.services.length} tétel</span>
        {isAdmin && <>
          <button onClick={() => setAddSvc(true)} style={{ background: "none", border: "none", cursor: "pointer", color: gold, fontSize: "1.1rem" }} title="Új szolgáltatás">＋</button>
          <button
            onClick={() => { if (confirm(`Törlöd a „${cat.name}" kategóriát és az összes benne lévő szolgáltatást?`)) delCat.mutate({ id: cat.id }); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.5)", fontSize: "0.9rem" }}
          >✕</button>
        </>}
      </div>

      {/* Services */}
      {cat.services.length === 0 ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", fontStyle: "italic", paddingLeft: "0.5rem" }}>
          Még nincs szolgáltatás ebben a kategóriában.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cat.services.map(svc => (
            <ServiceRow key={svc.id} svc={svc} onEdit={() => setEditSvc(svc)} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {isAdmin && addSvc && <ServiceModal categoryId={cat.id} onClose={() => setAddSvc(false)} />}
      {isAdmin && editSvc && <ServiceModal categoryId={cat.id} service={editSvc} onClose={() => setEditSvc(null)} />}
    </div>
  );
}

// ── Material row ───────────────────────────────────────────────────────────
type Material = { id: string; name: string; price: number; unit: string | null; active: boolean };

function MaterialRow({ mat }: { mat: Material }) {
  const utils  = api.useUtils();
  const inv    = () => void utils.materials.listAll.invalidate();
  const upd    = api.materials.update.useMutation({ onSuccess: inv });
  const toggle = api.materials.toggleActive.useMutation({ onSuccess: inv });
  const del    = api.materials.delete.useMutation({ onSuccess: inv });

  const [editing, setEditing] = useState(false);
  const [name, setName]   = useState(mat.name);
  const [price, setPrice] = useState(String(mat.price));
  const [unit, setUnit]   = useState(mat.unit ?? "");

  function save() {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p)) return;
    upd.mutate({ id: mat.id, name, price: p, unit: unit || undefined });
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.6rem 0.9rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Anyag neve" autoFocus style={{ ...inputStyle, flex: 2 }} />
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Ár" style={{ ...inputStyle, flex: 1 }} />
        <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="egység (pl. adag)" style={{ ...inputStyle, flex: 1 }} />
        <Btn onClick={save} disabled={upd.isPending}>Ment</Btn>
        <Btn variant="ghost" onClick={() => setEditing(false)}>✕</Btn>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.65rem 1rem", background: mat.active ? "rgba(251,191,36,0.04)" : "var(--bg-panel)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 8, opacity: mat.active ? 1 : 0.45, transition: "opacity 0.2s" }}>
      <div style={{ flex: 1, fontFamily: "var(--font-cormorant)", color: mat.active ? cream : dimmed, fontSize: "1rem" }}>{mat.name}</div>
      {mat.unit && <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "0.82rem" }}>{mat.unit}</div>}
      <div style={{ fontFamily: "var(--font-cormorant)", color: "#fbbf24", fontSize: "1rem", minWidth: 80, textAlign: "right" }}>
        {mat.price.toLocaleString("hu-HU")} Ft
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button onClick={() => toggle.mutate({ id: mat.id, active: !mat.active })} title={mat.active ? "Inaktiválás" : "Aktiválás"} style={{ background: "none", border: "none", cursor: "pointer", color: mat.active ? "#fbbf24" : dimmed, fontSize: "1rem" }}>
          {mat.active ? "✦" : "✧"}
        </button>
        <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: dimmed, fontSize: "0.9rem" }}>✎</button>
        <button onClick={() => { if (confirm(`Törlöd: „${mat.name}"?`)) del.mutate({ id: mat.id }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.5)", fontSize: "0.9rem" }}>✕</button>
      </div>
    </div>
  );
}

// ── Materials panel ────────────────────────────────────────────────────────
function MaterialsPanel() {
  const utils = api.useUtils();
  const { data: materials = [], isLoading } = api.materials.listAll.useQuery();
  const create = api.materials.create.useMutation({ onSuccess: () => { void utils.materials.listAll.invalidate(); setName(""); setPrice(""); setUnit(""); } });

  const [name, setName]   = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit]   = useState("");

  function add() {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p)) return;
    create.mutate({ name, price: p, unit: unit || undefined });
  }

  return (
    <div>
      {/* Add row */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", padding: "1rem 1.25rem", background: panelBg, border, borderRadius: 12, marginBottom: "1.5rem", backdropFilter: "blur(12px)" }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dimmed, marginBottom: "0.25rem" }}>Anyag neve</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Szőkítőpor, L'Oréal festék…" style={inputStyle}
            onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dimmed, marginBottom: "0.25rem" }}>Ár (Ft)</div>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="6000" style={inputStyle}
            onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dimmed, marginBottom: "0.25rem" }}>Egység (opc.)</div>
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pl. adag, tubus" style={inputStyle}
            onKeyDown={e => e.key === "Enter" && add()} />
        </div>
        <Btn onClick={add} disabled={!name.trim() || !price || create.isPending}>＋ Hozzáad</Btn>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", padding: "2rem", textAlign: "center" }}>Betöltés...</div>
      ) : materials.length === 0 ? (
        <div style={{ background: panelBg, border, borderRadius: 12, padding: "3rem", textAlign: "center", backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "0.85rem", letterSpacing: "0.1em" }}>Még nincs anyag felvéve</div>
          <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, marginTop: "0.5rem" }}>Add hozzá a szőkítőt, festéket és egyéb anyagokat.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {materials.map(m => <MaterialRow key={m.id} mat={m} />)}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ServicesClient({ isAdmin }: { isAdmin: boolean }) {
  const { data: categories, isLoading } = api.services.listCategories.useQuery();
  const [tab, setTab]     = useState<"services" | "materials">("services");
  const [addCat, setAddCat] = useState(false);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1.6rem", color: gold, letterSpacing: "0.12em", margin: 0, textShadow: "0 0 24px var(--border)" }}>
            ✂ Szolgáltatások & Anyagtár
          </h1>
          <p style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", margin: "0.4rem 0 0" }}>
            Árlista és felhasznált anyagok kezelése
          </p>
        </div>
        {tab === "services" && isAdmin && <Btn onClick={() => setAddCat(true)}>＋ Kategória</Btn>}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, marginBottom: "2rem", width: "fit-content" }}>
        {([["services", "✂ Szolgáltatások"], ["materials", "✦ Anyagtár"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: "0.5rem 1.25rem", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.12em", background: tab === key ? "var(--border)" : "transparent", color: tab === key ? gold : dimmed, transition: "all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Services tab */}
      {tab === "services" && (
        isLoading ? (
          <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Betöltés...</div>
        ) : !categories?.length ? (
          <div style={{ background: panelBg, border, borderRadius: 14, padding: "3rem", textAlign: "center", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✂</div>
            <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Még nincs árlista</div>
            {isAdmin && (
              <>
                <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", marginBottom: "1.5rem" }}>Hozd létre az első kategóriát, majd adj hozzá szolgáltatásokat.</div>
                <Btn onClick={() => setAddCat(true)}>＋ Első kategória</Btn>
              </>
            )}
          </div>
        ) : (
          categories.map(cat => <CategoryBlock key={cat.id} cat={cat} isAdmin={isAdmin} />)
        )
      )}

      {/* Materials tab */}
      {tab === "materials" && <MaterialsPanel />}

      {isAdmin && addCat && <CategoryModal onClose={() => setAddCat(false)} />}
    </div>
  );
}
