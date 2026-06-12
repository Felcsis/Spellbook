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
const gold   = "var(--color-gold)";
const cream  = "var(--color-cream)";
const dimmed = "rgba(245,230,211,0.45)";
const panelBg = "rgba(20,12,40,0.6)";
const border  = "1px solid rgba(201,168,76,0.2)";

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
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.25)",
  color: cream, fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

function Btn({ onClick, children, variant = "primary", disabled }: { onClick: () => void; children: React.ReactNode; variant?: "primary" | "ghost" | "danger"; disabled?: boolean }) {
  const bg: Record<string, string> = {
    primary: "linear-gradient(135deg, rgba(124,58,237,0.7), rgba(201,168,76,0.5))",
    ghost:   "rgba(255,255,255,0.05)",
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
function ServiceRow({ svc, onEdit }: { svc: Service; onEdit: () => void }) {
  const utils = api.useUtils();
  const del    = api.services.deleteService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });
  const toggle = api.services.updateService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.7rem 1rem", borderRadius: 8,
        background: svc.active ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.02)",
        border: "1px solid rgba(201,168,76,0.1)",
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
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button onClick={() => toggle.mutate({ id: svc.id, active: !svc.active })} title={svc.active ? "Inaktiválás" : "Aktiválás"} style={{ background: "none", border: "none", cursor: "pointer", color: svc.active ? gold : dimmed, fontSize: "1rem" }}>
          {svc.active ? "✦" : "✧"}
        </button>
        <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: dimmed, fontSize: "0.9rem" }}>✎</button>
        <button onClick={() => { if (confirm(`Törlöd: „${svc.name}"?`)) del.mutate({ id: svc.id }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.6)", fontSize: "0.9rem" }}>✕</button>
      </div>
    </div>
  );
}

// ── Category block ─────────────────────────────────────────────────────────
function CategoryBlock({ cat }: { cat: Category }) {
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
        <button onClick={() => setAddSvc(true)} style={{ background: "none", border: "none", cursor: "pointer", color: gold, fontSize: "1.1rem" }} title="Új szolgáltatás">＋</button>
        <button
          onClick={() => { if (confirm(`Törlöd a „${cat.name}" kategóriát és az összes benne lévő szolgáltatást?`)) delCat.mutate({ id: cat.id }); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.5)", fontSize: "0.9rem" }}
        >✕</button>
      </div>

      {/* Services */}
      {cat.services.length === 0 ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", fontStyle: "italic", paddingLeft: "0.5rem" }}>
          Még nincs szolgáltatás ebben a kategóriában.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cat.services.map(svc => (
            <ServiceRow key={svc.id} svc={svc} onEdit={() => setEditSvc(svc)} />
          ))}
        </div>
      )}

      {addSvc && <ServiceModal categoryId={cat.id} onClose={() => setAddSvc(false)} />}
      {editSvc && <ServiceModal categoryId={cat.id} service={editSvc} onClose={() => setEditSvc(null)} />}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ServicesClient() {
  const { data: categories, isLoading } = api.services.listCategories.useQuery();
  const [addCat, setAddCat] = useState(false);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1.6rem", color: gold, letterSpacing: "0.12em", margin: 0, textShadow: "0 0 24px rgba(201,168,76,0.3)" }}>
            ✂ Szolgáltatások
          </h1>
          <p style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", margin: "0.4rem 0 0" }}>
            Árlista — kategóriák és kezelések kezelése
          </p>
        </div>
        <Btn onClick={() => setAddCat(true)}>＋ Kategória</Btn>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Betöltés...</div>
      ) : !categories?.length ? (
        <div
          style={{ background: panelBg, border, borderRadius: 14, padding: "3rem", textAlign: "center", backdropFilter: "blur(12px)" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✂</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
            Még nincs árlista
          </div>
          <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", marginBottom: "1.5rem" }}>
            Hozd létre az első kategóriát, majd adj hozzá szolgáltatásokat.
          </div>
          <Btn onClick={() => setAddCat(true)}>＋ Első kategória</Btn>
        </div>
      ) : (
        categories.map(cat => <CategoryBlock key={cat.id} cat={cat} />)
      )}

      {addCat && <CategoryModal onClose={() => setAddCat(false)} />}
    </div>
  );
}
