"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import type { ParsedCategory } from "~/app/api/import-pdf/route";

// ── Types ──────────────────────────────────────────────────────────────────
type Service = {
  id: string; name: string; price: number; duration: number;
  description: string | null; active: boolean; order: number;
};
type Category = {
  id: string; name: string; order: number; priceListType: string; services: Service[];
};
type PriceList = "master" | "beginner";

// ── Style helpers ──────────────────────────────────────────────────────────
const gold   = "var(--color-teal)";
const cream  = "var(--text-primary)";
const dimmed = "var(--text-soft)";
const panelBg = "var(--bg-card)";
const border  = "1px solid var(--border)";

// ── Portal modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{ background: "var(--bg-modal)", border, borderRadius: 14, padding: "2rem", width: 420, maxWidth: "calc(100vw - 2rem)", boxShadow: "var(--shadow-modal)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>{title}</div>
        {children}
      </div>
    </div>,
    document.body
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
    primary: "",
    ghost:   "var(--bg-today)",
    danger:  "rgba(220,50,50,0.15)",
  };
  const col: Record<string, string> = { primary: "#fff", ghost: dimmed, danger: "rgba(255,100,100,0.85)" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variant === "primary" ? "btn-gold" : undefined}
      style={{ padding: "0.5rem 1.1rem", borderRadius: 8, border: variant === "primary" ? "none" : border, background: variant === "primary" ? undefined : bg[variant], color: col[variant], fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s" }}
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
  const [err, setErr]     = useState("");

  const create = api.services.createService.useMutation({
    onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); },
    onError:   e  => setErr(e.message),
  });
  const update = api.services.updateService.useMutation({
    onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); },
    onError:   e  => setErr(e.message),
  });

  const save = () => {
    setErr("");
    const p = parseFloat(price);
    const d = parseInt(dur);
    if (!name.trim()) { setErr("A megnevezés megadása kötelező."); return; }
    if (isNaN(p) || p < 0) { setErr("Adj meg érvényes árat."); return; }
    if (isNaN(d) || d <= 0) { setErr("Adj meg érvényes időtartamot."); return; }
    if (service) {
      update.mutate({ id: service.id, name, price: p, duration: d, description: desc || undefined });
    } else {
      create.mutate({ categoryId, name, price: p, duration: d, description: desc || undefined });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Modal title={service ? "Szolgáltatás szerkesztése" : "Új szolgáltatás"} onClose={onClose}>
      <Field label="Megnevezés">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="pl. Hajvágás" autoFocus
          onKeyDown={e => e.key === "Enter" && save()} />
      </Field>
      <Field label="Ár (Ft)">
        <input style={inputStyle} type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="pl. 5000"
          onKeyDown={e => e.key === "Enter" && save()} />
      </Field>
      <Field label="Időtartam (perc)">
        <input style={inputStyle} type="number" value={dur} onChange={e => setDur(e.target.value)} placeholder="30"
          onKeyDown={e => e.key === "Enter" && save()} />
      </Field>
      <Field label="Megjegyzés (opcionális)">
        <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="rövid leírás..."
          onKeyDown={e => e.key === "Enter" && save()} />
      </Field>
      {err && (
        <div style={{ color: "#e05555", fontSize: "0.85rem", marginBottom: "0.75rem", fontFamily: "var(--font-cormorant)" }}>
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <Btn variant="ghost" onClick={onClose}>Mégsem</Btn>
        <Btn onClick={save} disabled={isPending}>{isPending ? "Mentés…" : "Mentés"}</Btn>
      </div>
    </Modal>
  );
}

// ── Add category modal ─────────────────────────────────────────────────────
function CategoryModal({ priceListType, onClose }: { priceListType: PriceList; onClose: () => void }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const create = api.services.createCategory.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); } });
  return (
    <Modal title="Új kategória" onClose={onClose}>
      <Field label="Kategória neve">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="pl. Hajkezelések" autoFocus onKeyDown={e => e.key === "Enter" && create.mutate({ name, priceListType })} />
      </Field>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <Btn variant="ghost" onClick={onClose}>Mégsem</Btn>
        <Btn onClick={() => create.mutate({ name, priceListType })} disabled={!name.trim() || create.isPending}>Létrehozás</Btn>
      </div>
    </Modal>
  );
}

// ── Service row ────────────────────────────────────────────────────────────
function ServiceRow({
  svc, onEdit, isAdmin,
  dragHandleProps,
  isDragging,
}: {
  svc: Service; onEdit: () => void; isAdmin: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}) {
  const utils = api.useUtils();
  const del    = api.services.deleteService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });
  const toggle = api.services.updateService.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.7rem 1rem", borderRadius: 8,
        background: svc.active ? "var(--bg-today)" : "var(--bg-panel)",
        border: `1px solid ${isDragging ? "var(--color-teal)" : "var(--bg-highlight)"}`,
        opacity: isDragging ? 0.5 : svc.active ? 1 : 0.5,
        transition: "opacity 0.15s, border-color 0.15s",
        boxShadow: isDragging ? "0 4px 20px rgba(74,124,126,0.25)" : "none",
      }}
    >
      {isAdmin && (
        <div
          {...dragHandleProps}
          style={{ cursor: "grab", color: dimmed, fontSize: "1rem", lineHeight: 1, userSelect: "none", touchAction: "none", paddingRight: "0.1rem" }}
          title="Húzd a sorrendhez"
        >
          ⠿
        </div>
      )}
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
  const [addSvc, setAddSvc]     = useState(false);
  const [editSvc, setEditSvc]   = useState<Service | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal]   = useState(cat.name);
  const [items, setItems]       = useState<Service[]>(cat.services);
  const [dragIdx, setDragIdx]   = useState<number | null>(null);
  const [overIdx, setOverIdx]   = useState<number | null>(null);

  // keep local list in sync when server data changes
  useEffect(() => { setItems(cat.services); }, [cat.services]);

  const reorder = api.services.reorderServices.useMutation({
    onSuccess: () => void utils.services.listCategories.invalidate(),
  });

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...items];
    const moved = next.splice(dragIdx, 1)[0];
    if (!moved) { setDragIdx(null); setOverIdx(null); return; }
    next.splice(targetIdx, 0, moved);
    setItems(next);
    setDragIdx(null);
    setOverIdx(null);
    reorder.mutate(next.map((s, i) => ({ id: s.id, order: i })));
  };

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const delCat    = api.services.deleteCategory.useMutation({ onSuccess: () => void utils.services.listCategories.invalidate() });
  const updateCat = api.services.updateCategory.useMutation({ onSuccess: () => { void utils.services.listCategories.invalidate(); setEditName(false); } });

  return (
    <div style={{ background: panelBg, border, borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem" }}>
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
      {items.length === 0 ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", fontStyle: "italic", paddingLeft: "0.5rem" }}>
          Még nincs szolgáltatás ebben a kategóriában.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((svc, idx) => (
            <div
              key={svc.id}
              draggable={isAdmin}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                outline: overIdx === idx && dragIdx !== idx ? `2px dashed var(--color-teal)` : "none",
                borderRadius: 8,
              }}
            >
              <ServiceRow
                svc={svc}
                onEdit={() => setEditSvc(svc)}
                isAdmin={isAdmin}
                isDragging={dragIdx === idx}
              />
            </div>
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

function MaterialRow({ mat, isAdmin }: { mat: Material; isAdmin: boolean }) {
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
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.65rem 1rem", background: mat.active ? "rgba(196,146,110,0.04)" : "var(--bg-panel)", border: "1px solid rgba(196,146,110,0.15)", borderRadius: 8, opacity: mat.active ? 1 : 0.45, transition: "opacity 0.2s" }}>
      <div style={{ flex: 1, fontFamily: "var(--font-cormorant)", color: mat.active ? cream : dimmed, fontSize: "1rem" }}>{mat.name}</div>
      {mat.unit && <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "0.82rem" }}>{mat.unit}</div>}
      <div style={{ fontFamily: "var(--font-cormorant)", color: "#c4926e", fontSize: "1rem", minWidth: 80, textAlign: "right" }}>
        {mat.price.toLocaleString("hu-HU")} Ft
      </div>
      {isAdmin && (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => toggle.mutate({ id: mat.id, active: !mat.active })} title={mat.active ? "Inaktiválás" : "Aktiválás"} style={{ background: "none", border: "none", cursor: "pointer", color: mat.active ? "#c4926e" : dimmed, fontSize: "1rem" }}>
            {mat.active ? "✦" : "✧"}
          </button>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: dimmed, fontSize: "0.9rem" }}>✎</button>
          <button onClick={() => { if (confirm(`Törlöd: „${mat.name}"?`)) del.mutate({ id: mat.id }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.5)", fontSize: "0.9rem" }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Materials panel ────────────────────────────────────────────────────────
function MaterialsPanel({ isAdmin }: { isAdmin: boolean }) {
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
      {/* Add row — admin only */}
      {isAdmin && <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap", padding: "1rem 1.25rem", background: panelBg, border, borderRadius: 12, marginBottom: "1.5rem" }}>
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
      </div>}

      {/* List */}
      {isLoading ? (
        <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", padding: "2rem", textAlign: "center" }}>Betöltés...</div>
      ) : materials.length === 0 ? (
        <div style={{ background: panelBg, border, borderRadius: 12, padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "0.85rem", letterSpacing: "0.1em" }}>Még nincs anyag felvéve</div>
          <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, marginTop: "0.5rem" }}>Add hozzá a szőkítőt, festéket és egyéb anyagokat.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {materials.map(m => <MaterialRow key={m.id} mat={m} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

// ── PDF Import Modal ──────────────────────────────────────────────────────
function PdfImportModal({ priceListType, onClose }: { priceListType: PriceList; onClose: () => void }) {
  const utils = api.useUtils();
  const bulkImport = api.services.bulkImport.useMutation({
    onSuccess: () => { void utils.services.listCategories.invalidate(); onClose(); },
  });

  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) { setError("Csak PDF fájlt lehet feltölteni."); return; }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await fetch("/api/import-pdf", { method: "POST", body: form });
      const json = await res.json() as { categories?: ParsedCategory[]; error?: string };
      if (!res.ok || json.error) { setError(json.error ?? "Ismeretlen hiba."); return; }
      setCategories(json.categories ?? []);
      setStep("preview");
    } catch {
      setError("Hálózati hiba. Próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  function updateServiceName(ci: number, si: number, val: string) {
    setCategories(prev => prev.map((c, i) => i !== ci ? c : {
      ...c, services: c.services.map((s, j) => j !== si ? s : { ...s, name: val }),
    }));
  }
  function updateServicePrice(ci: number, si: number, val: string) {
    const n = parseInt(val.replace(/\D/g, ""), 10);
    setCategories(prev => prev.map((c, i) => i !== ci ? c : {
      ...c, services: c.services.map((s, j) => j !== si ? s : { ...s, price: isNaN(n) ? s.price : n }),
    }));
  }
  function removeService(ci: number, si: number) {
    setCategories(prev => prev.map((c, i) => i !== ci ? c : {
      ...c, services: c.services.filter((_, j) => j !== si),
    }).filter(c => c.services.length > 0));
  }
  function updateCatName(ci: number, val: string) {
    setCategories(prev => prev.map((c, i) => i !== ci ? c : { ...c, name: val }));
  }

  const totalServices = categories.reduce((s, c) => s + c.services.length, 0);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 16, padding: "2rem", width: step === "preview" ? 640 : 440, maxWidth: "calc(100vw - 2rem)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-modal)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em" }}>
            {step === "upload" ? "PDF árlista importálása" : `Előnézet — ${totalServices} szolgáltatás`}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dimmed, fontSize: "1.2rem" }}>✕</button>
        </div>

        {/* Upload step */}
        {step === "upload" && (
          <div>
            <div
              style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "3rem 2rem", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f); }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📄</div>
              <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "0.8rem", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                {loading ? "Feldolgozás..." : "Húzd ide a PDF-et vagy kattints"}
              </div>
              <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "0.9rem" }}>
                Szöveges árlistát tartalmazó PDF fájl
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
            {error && <div style={{ color: "#e05555", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", marginTop: "1rem", textAlign: "center" }}>{error}</div>}
            <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "0.82rem", marginTop: "1.25rem", lineHeight: 1.6 }}>
              <b style={{ color: cream }}>Tipp:</b> Akkor működik legjobban ha a PDF szöveges (nem szkennelt kép), és az árakat számként tartalmazza (pl. &quot;Hajvágás 5000 Ft&quot;).
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}>
              {categories.map((cat, ci) => (
                <div key={ci} style={{ marginBottom: "1.5rem" }}>
                  <input
                    value={cat.name}
                    onChange={e => updateCatName(ci, e.target.value)}
                    style={{ ...inputStyle, fontFamily: "var(--font-cinzel)", fontSize: "0.85rem", color: gold, marginBottom: "0.75rem" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {cat.services.map((svc, si) => (
                      <div key={si} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          value={svc.name}
                          onChange={e => updateServiceName(ci, si, e.target.value)}
                          style={{ ...inputStyle, flex: 3 }}
                          placeholder="Szolgáltatás neve"
                        />
                        <input
                          type="number"
                          value={svc.price}
                          onChange={e => updateServicePrice(ci, si, e.target.value)}
                          style={{ ...inputStyle, flex: 1 }}
                          placeholder="Ár"
                        />
                        <span style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "0.85rem", whiteSpace: "nowrap" }}>Ft</span>
                        <button onClick={() => removeService(ci, si)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,50,50,0.6)", fontSize: "1rem", flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <div style={{ color: "#e05555", fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", margin: "0.75rem 0" }}>{error}</div>}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <Btn variant="ghost" onClick={() => setStep("upload")}>← Vissza</Btn>
              <Btn
                onClick={() => bulkImport.mutate({ priceListType, categories })}
                disabled={bulkImport.isPending || categories.length === 0}
              >
                {bulkImport.isPending ? "Importálás..." : `Importálás (${totalServices} tétel)`}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ServicesClient({ isAdmin }: { isAdmin: boolean }) {
  const { data: categories = [], isLoading } = api.services.listCategories.useQuery();
  const [tab,        setTab]       = useState<"services" | "materials">("services");
  const [priceList,  setPriceList] = useState<PriceList>(isAdmin ? "master" : "beginner");
  const [addCat,     setAddCat]    = useState(false);
  const [pdfImport,  setPdfImport] = useState(false);

  const visibleCats = categories.filter(c => c.priceListType === priceList);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1.6rem", color: gold, letterSpacing: "0.12em", margin: 0, textShadow: "0 0 24px var(--border)" }}>
            ✂ Szolgáltatások & Anyagtár
          </h1>
          <p style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", margin: "0.4rem 0 0" }}>
            Árlista és felhasznált anyagok kezelése
          </p>
        </div>
        {tab === "services" && isAdmin && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Btn variant="ghost" onClick={() => setPdfImport(true)}>📄 PDF import</Btn>
            <Btn onClick={() => setAddCat(true)}>＋ Kategória</Btn>
          </div>
        )}
      </div>

      {/* Main tab switcher */}
      <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 3, marginBottom: tab === "services" ? "1rem" : "2rem", width: "fit-content" }}>
        {([["services", "✂ Szolgáltatások"], ["materials", "✦ Anyagtár"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: "0.5rem 1.25rem", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.12em", background: tab === key ? "var(--border)" : "transparent", color: tab === key ? gold : dimmed, transition: "all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Price list sub-tabs — admin only */}
      {tab === "services" && isAdmin && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {([["master", "◈ Mester árlista"], ["beginner", "✦ Fodrász árlista"]] as [PriceList, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPriceList(key)}
              style={{ padding: "0.42rem 1rem", borderRadius: 8, border: priceList === key ? `1px solid ${key === "master" ? "rgba(74,124,126,0.5)" : "rgba(196,146,110,0.5)"}` : "1px solid var(--border)", background: priceList === key ? (key === "master" ? "rgba(74,124,126,0.1)" : "rgba(196,146,110,0.1)") : "transparent", color: priceList === key ? (key === "master" ? gold : "#c4926e") : dimmed, fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "services" && !isAdmin && (
        <div style={{ marginBottom: "2rem", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.15em", color: "#c4926e", textTransform: "uppercase" }}>
          ✦ Fodrász árlista
        </div>
      )}

      {/* Services tab */}
      {tab === "services" && (
        isLoading ? (
          <div style={{ color: dimmed, fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Betöltés...</div>
        ) : visibleCats.length === 0 ? (
          <div style={{ background: panelBg, border, borderRadius: 14, padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{priceList === "master" ? "✂" : "✦"}</div>
            <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "1rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              {priceList === "master" ? "Még nincs mester árlista" : "Még nincs fodrász árlista"}
            </div>
            {isAdmin && (
              <>
                <div style={{ fontFamily: "var(--font-cormorant)", color: dimmed, fontSize: "1rem", marginBottom: "1.5rem" }}>Hozd létre az első kategóriát, majd adj hozzá szolgáltatásokat.</div>
                <Btn onClick={() => setAddCat(true)}>＋ Első kategória</Btn>
              </>
            )}
          </div>
        ) : (
          visibleCats.map(cat => <CategoryBlock key={cat.id} cat={cat} isAdmin={isAdmin} />)
        )
      )}

      {/* Materials tab */}
      {tab === "materials" && <MaterialsPanel isAdmin={isAdmin} />}

      {isAdmin && addCat    && <CategoryModal priceListType={priceList} onClose={() => setAddCat(false)} />}
      {isAdmin && pdfImport && <PdfImportModal priceListType={priceList} onClose={() => setPdfImport(false)} />}
    </div>
  );
}
