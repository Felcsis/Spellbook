"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EditCardModal, fmt, MAT_OPTIONS } from "~/app/dashboard/_card-edit-modal";
import type { GuestCardData, MatRow, SvcRow } from "~/app/dashboard/_card-edit-modal";
import { useIsMobile } from "~/app/_responsive";

const gold  = "var(--color-teal)";
const cream = "var(--text-primary)";
const dim   = "var(--text-soft)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9,
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: cream, fontFamily: "var(--font-cormorant)", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem",
};

type GuestWithCards = {
  id: string; name: string; phone: string | null; notes: string | null;
  cards: GuestCardData[];
};

// ── PDF export ────────────────────────────────────────────────────────────────
function exportCardPdf(guestName: string, card: GuestCardData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const dateLabel = new Date(card.date).toLocaleDateString("hu-HU", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text("Salon Spellbook", pageW / 2, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(`Vendég: ${guestName}`, 20, 32);
  doc.text(`Dátum: ${dateLabel}`, 20, 39);
  doc.text(`Fodrász: ${card.worker.name ?? "—"}`, 20, 46);

  doc.setDrawColor(180, 180, 180);
  doc.line(20, 51, pageW - 20, 51);

  let y = 58;

  // Services
  if (card.services.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Elvégzett szolgáltatások", 20, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Szolgáltatás", "Ár (Ft)"]],
      body: card.services.map(s => [s.name + (s.gender ? ` (${s.gender})` : ""), s.price.toLocaleString("hu-HU")]),
      foot: [["Összesen", card.services.reduce((s, x) => s + x.price, 0).toLocaleString("hu-HU") + " Ft"]],
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [60, 100, 100], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 20, right: 20 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Color recipe
  if (card.materials.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Szin recept", 20, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Anyag", "Márka", "Kód", "Gramm", "Ár (Ft)"]],
      body: card.materials.map(m => [m.name, m.brand ?? "—", m.colorCode ?? "—", `${m.grams}g`, m.lineTotal.toLocaleString("hu-HU")]),
      foot: [["", "", "", "Összesen", card.materials.reduce((s, m) => s + m.lineTotal, 0).toLocaleString("hu-HU") + " Ft"]],
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [80, 60, 100], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
      columnStyles: { 4: { halign: "right" } },
      margin: { left: 20, right: 20 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Notes
  if (card.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Megjegyzes: ${card.notes}`, 20, y);
    y += 8;
  }

  // Grand total
  const total = card.total;
  doc.setDrawColor(180, 180, 180);
  doc.line(20, y, pageW - 20, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Vegosszeg:", 20, y);
  doc.text(`${total.toLocaleString("hu-HU")} Ft`, pageW - 20, y, { align: "right" });

  const fileName = `${guestName.replace(/\s+/g, "_")}_${new Date(card.date).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ── Single visit card ─────────────────────────────────────────────────────────
function VisitCard({ card, onDelete, onEdit, isAdmin, guestName }: { card: GuestCardData; onDelete: () => void; onEdit: () => void; isAdmin: boolean; guestName: string }) {
  const [open, setOpen] = useState(false);

  const dateLabel = new Date(card.date).toLocaleDateString("hu-HU", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--bg-active)", borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--bg-active)"; }}>

      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: dim, minWidth: 110 }}>{dateLabel}</div>
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.85rem", color: "rgba(167,139,250,0.7)", flex: 1 }}>
          {card.worker.name}
          {card.services.length > 0 && <span style={{ color: dim }}> · {card.services.map(s => s.name).join(", ")}</span>}
        </div>
        {card.materials.length > 0 && (
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.48rem", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "0.15rem 0.5rem", border: "1px solid var(--border)", borderRadius: 4 }}>
            ✦ RECEPT
          </span>
        )}
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", color: gold, fontWeight: 700, minWidth: 70, textAlign: "right" }}>{fmt(card.total)}</div>
        <span style={{ color: dim, fontSize: "0.75rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--bg-highlight)", padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {card.services.length > 0 && (
            <div>
              <div style={{ ...labelStyle, color: "var(--text-muted)", marginBottom: "0.4rem" }}>◈ Elvégzett szolgáltatások</div>
              {card.services.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--bg-panel)" }}>
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: cream }}>{s.name}{s.gender && <span style={{ fontSize: "0.75rem", color: dim, marginLeft: "0.4rem" }}>({s.gender})</span>}</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price)}</span>
                </div>
              ))}
            </div>
          )}

          {card.materials.length > 0 && (
            <div>
              <div style={{ ...labelStyle, color: "var(--text-muted)", marginBottom: "0.4rem" }}>✦ Szín recept</div>
              <div className="scroll-x">
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 0.9fr 0.7fr 0.9fr", gap: "0.25rem 0.6rem", alignItems: "center", minWidth: 360 }}>
                {["Anyag","Márka","Kód","Gramm","Ár"].map(h => (
                  <div key={h} style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.44rem", letterSpacing: "0.12em", color: "var(--border)", textTransform: "uppercase", paddingBottom: "0.2rem", borderBottom: "1px solid var(--bg-highlight)" }}>{h}</div>
                ))}
                {card.materials.map(m => (
                  <>
                    <span key={`${m.id}n`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: cream }}>{m.name}</span>
                    <span key={`${m.id}b`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: dim }}>{m.brand ?? "—"}</span>
                    <span key={`${m.id}c`} style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.88rem", color: "rgba(232,180,200,0.8)", letterSpacing: "0.05em" }}>{m.colorCode ?? "—"}</span>
                    <span key={`${m.id}g`} style={{ fontFamily: "var(--font-playfair)", fontSize: "0.82rem", color: dim }}>{m.grams}g</span>
                    <span key={`${m.id}p`} style={{ fontFamily: "var(--font-playfair)", fontSize: "0.85rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(m.lineTotal)}</span>
                  </>
                ))}
              </div>
              </div>
            </div>
          )}

          {card.notes && (
            <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.92rem", color: dim, fontStyle: "italic", padding: "0.4rem 0.7rem", background: "var(--bg-panel)", borderRadius: 7, borderLeft: "2px solid var(--border)" }}>
              {card.notes}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid var(--bg-highlight)" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onDelete} style={{ background: "none", border: "none", color: "rgba(248,113,113,0.35)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.35)"; }}>
                Törlés
              </button>
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                style={{ background: "none", border: "none", color: "rgba(122,158,140,0.5)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-teal)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(122,158,140,0.5)"; }}>
                Szerkesztés
              </button>
              <button onClick={e => { e.stopPropagation(); exportCardPdf(guestName, card); }}
                style={{ background: "none", border: "none", color: "rgba(201,168,76,0.5)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.55rem", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c9a84c"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.5)"; }}>
                PDF mentés
              </button>
            </div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.12em", color: dim }}>
              VÉGÖSSZEG <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: gold, fontWeight: 700, marginLeft: "0.4rem" }}>{fmt(card.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Guest row in receptkönyv ───────────────────────────────────────────────────
function GuestRow({ guest, onDeleteCard, onNewCard, isAdmin }: {
  guest: GuestWithCards;
  onDeleteCard: (id: string) => void;
  onNewCard: (guestId: string, guestName: string) => void;
  isAdmin: boolean;
}) {
  const utils = api.useUtils();
  const isMobile = useIsMobile();
  const [open,        setOpen]        = useState(false);
  const [editingCard, setEditingCard] = useState<GuestCardData | null>(null);
  const [editGuest,   setEditGuest]   = useState(false);
  const [editName,    setEditName]    = useState(guest.name);
  const [editPhone,   setEditPhone]   = useState(guest.phone ?? "");
  const [editNotes,   setEditNotes]   = useState(guest.notes ?? "");

  const updateGuest = api.guests.updateGuest.useMutation({
    onSuccess: () => { void utils.guests.guestBook.invalidate(); setEditGuest(false); },
  });
  const deleteGuest = api.guests.deleteGuest.useMutation({
    onSuccess: () => void utils.guests.guestBook.invalidate(),
  });

  const totalSpent = guest.cards.reduce((s, c) => s + c.total, 0);
  const lastVisit  = guest.cards[0] ? new Date(guest.cards[0].date).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <>
    {editingCard && <EditCardModal card={editingCard} onClose={() => setEditingCard(null)} />}
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px var(--bg-highlight)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>

      <div style={{ padding: "1.1rem 1.4rem", display: "flex", alignItems: "center", gap: "0.7rem 1rem", cursor: "pointer", flexWrap: isMobile ? "wrap" : "nowrap" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--bg-active), var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cinzel)", fontSize: "1rem", color: cream, flexShrink: 0, border: "1px solid var(--border)" }}>
          {(guest.name[0] ?? "?").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: isMobile ? "calc(100% - 3.7rem)" : 0 }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1.1rem", color: cream }}>{guest.name}</div>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: dim, display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <span>{guest.cards.length} látogatás</span>
            {guest.phone && <span>📞 {guest.phone}</span>}
            {lastVisit  && <span>Utolsó: {lastVisit}</span>}
          </div>
        </div>
        {totalSpent > 0 && (
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: "1rem", color: gold, fontWeight: 700, flexShrink: 0, marginLeft: isMobile ? "auto" : undefined }}>{fmt(totalSpent)}</div>
        )}
        <button type="button" onClick={e => { e.stopPropagation(); setEditGuest(v => !v); setOpen(true); }}
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: editGuest ? "var(--color-teal)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.08em", padding: "0.28rem 0.55rem", flexShrink: 0, transition: "all 0.2s" }}>
          ✎
        </button>
        <button type="button"
          onClick={e => { e.stopPropagation(); onNewCard(guest.id, guest.name); }}
          style={{ background: "var(--bg-highlight)", border: "1px solid var(--border)", borderRadius: 7, color: gold, cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.52rem", letterSpacing: "0.1em", padding: "0.3rem 0.65rem", flexShrink: 0, transition: "all 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}>
          ＋ Kártya
        </button>
        <span style={{ color: dim, fontSize: "0.85rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--bg-highlight)", padding: "0.85rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>

          {/* Guest edit form */}
          {editGuest && (
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Vendég adatai</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input value={editName}  onChange={e => setEditName(e.target.value)}  placeholder="Név"      style={{ ...inputStyle, flex: 2, minWidth: 120 }} />
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Telefon"  style={{ ...inputStyle, flex: 1, minWidth: 100 }} />
              </div>
              <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Megjegyzés (pl. allergia, preferenciák…)" style={inputStyle} />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => { if (confirm("Biztosan törlöd ezt a vendéget és az összes kártyáját?")) deleteGuest.mutate({ id: guest.id }); }}
                  style={{ padding: "0.35rem 0.85rem", borderRadius: 7, border: "1px solid rgba(248,113,113,0.55)", background: "rgba(248,113,113,0.12)", color: "#f87171", cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>
                  Vendég törlése
                </button>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => setEditGuest(false)} style={{ padding: "0.35rem 0.85rem", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: dim, cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>Mégsem</button>
                  <button onClick={() => updateGuest.mutate({ id: guest.id, name: editName.trim() || guest.name, phone: editPhone || undefined, notes: editNotes || undefined })}
                    disabled={updateGuest.isPending}
                    className="btn-gold"
                    style={{ padding: "0.35rem 1rem", borderRadius: 7, cursor: "pointer", fontFamily: "var(--font-cinzel)", fontSize: "0.5rem", letterSpacing: "0.1em", fontWeight: 700 }}>
                    {updateGuest.isPending ? "…" : "Mentés"}
                  </button>
                </div>
              </div>
              {guest.notes && !editNotes && (
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.9rem", color: dim, fontStyle: "italic", padding: "0.3rem 0.5rem", borderLeft: "2px solid var(--border)" }}>{guest.notes}</div>
              )}
            </div>
          )}

          {guest.cards.length === 0 ? (
            <div style={{ fontFamily: "var(--font-cormorant)", color: dim, textAlign: "center", padding: "1rem", fontStyle: "italic" }}>Még nincs mentett kártya</div>
          ) : (
            guest.cards.map(card => (
              <VisitCard key={card.id} card={card} isAdmin={isAdmin} guestName={guest.name}
                onDelete={() => { if (confirm("Törlöd ezt a kártyát?")) onDeleteCard(card.id); }}
                onEdit={() => setEditingCard(card)} />
            ))
          )}
        </div>
      )}
    </div>
    </>
  );
}

// ── New card modal ────────────────────────────────────────────────────────────
function NewCardModal({ prefillGuestId, prefillGuestName, onClose }: {
  prefillGuestId?: string;
  prefillGuestName?: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  const { data: allGuests = [] }  = api.guests.listGuests.useQuery();
  const { data: workers = [] }    = api.calendar.users.useQuery();
  const { data: categories = [] } = api.services.listCategories.useQuery();

  const createGuest   = api.guests.createGuest.useMutation({ onSuccess: () => void utils.guests.listGuests.invalidate() });
  const createCard    = api.guests.createCard.useMutation({ onSuccess: () => void utils.guests.guestBook.invalidate() });
  const createFinance = api.finance.create.useMutation({ onSuccess: () => void utils.finance.list.invalidate() });

  const [guestSearch, setGuestSearch] = useState(prefillGuestName ?? "");
  const [guestId,     setGuestId]     = useState(prefillGuestId ?? "");
  const [guestName,   setGuestName]   = useState("");
  const [guestOpen,   setGuestOpen]   = useState(false);
  const [newGuest,    setNewGuest]    = useState(false);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [date,     setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [notes,    setNotes]    = useState("");

  const [svcSearch, setSvcSearch] = useState("");
  const [svcOpen,   setSvcOpen]   = useState(false);
  const [selSvcs,   setSelSvcs]   = useState<SvcRow[]>([]);

  const allSvcs: { id: string; name: string; price: number; duration: number; categoryName: string }[] = [];
  categories.forEach(c => c.services.forEach((s: { id: string; name: string; price: number; duration: number }) =>
    allSvcs.push({ ...s, duration: s.duration ?? 0, categoryName: c.name })
  ));
  const filtSvcs = svcSearch.trim()
    ? allSvcs.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
    : allSvcs;

  const [matRows,   setMatRows]   = useState<MatRow[]>([{ name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }]);
  const [matSearch, setMatSearch] = useState("");
  const [matOpen,   setMatOpen]   = useState(false);
  const [activeMat, setActiveMat] = useState(0);

  const filtMat = matSearch.trim()
    ? MAT_OPTIONS.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()))
    : MAT_OPTIONS;

  const filtGuests = guestSearch.trim()
    ? allGuests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase()))
    : allGuests;

  const svcTotal   = selSvcs.reduce((s, x) => s + x.price, 0);
  const matTotal   = matRows.reduce((s, r) => s + r.lineTotal, 0);
  const grandTotal = svcTotal + matTotal;

  function updateMat(i: number, field: keyof MatRow, val: string | number) {
    setMatRows(prev => {
      const rows = [...prev];
      const row = { ...rows[i]! };
      (row as Record<string, string | number>)[field] = val;
      if (field === "grams" || field === "unitPrice") {
        const g = parseFloat(field === "grams" ? String(val) : row.grams);
        const p = field === "unitPrice" ? Number(val) : row.unitPrice;
        row.lineTotal = isNaN(g) ? 0 : g * p;
      }
      rows[i] = row;
      return rows;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let finalGuestId = guestId;
    if (newGuest && guestName.trim()) {
      const g = await createGuest.mutateAsync({ name: guestName.trim() });
      finalGuestId = g.id;
    }
    if (!finalGuestId) return;
    const finalWorkerId = workerId || (workers[0]?.id ?? "");
    const mats = matRows
      .filter(r => r.name.trim() && parseFloat(r.grams) > 0)
      .map(r => ({
        name: r.name, brand: r.brand || undefined, colorCode: r.colorCode || undefined,
        grams: parseFloat(r.grams), unitPrice: r.unitPrice, lineTotal: r.lineTotal,
      }));
    const card = await createCard.mutateAsync({
      guestId: finalGuestId,
      workerId: finalWorkerId,
      date, notes: notes || undefined,
      services: selSvcs,
      materials: mats,
    });

    // Revenue entry linked to the card
    const gLabel = (g?: string) => g === "nő" ? "Női" : g === "férfi" ? "Férfi" : g === "gyermek" ? "Gyermek" : "";
    if (selSvcs.length > 0) {
      const svcTotal = selSvcs.reduce((s, x) => s + x.price, 0);
      const desc = selSvcs.map(s => [gLabel(s.gender), s.name, s.categoryName].filter(Boolean).join(" ")).join(", ");
      await createFinance.mutateAsync({
        type: "revenue", description: desc, amount: svcTotal, date,
        guestCardId: card.id, workerUserId: finalWorkerId,
      });
    }
    // Material entry linked to same card
    if (mats.length > 0) {
      const matTot = mats.reduce((s, r) => s + r.lineTotal, 0);
      const matDesc = mats.map(r => `${r.name} (${r.grams}g)`).join(", ");
      await createFinance.mutateAsync({
        type: "material", description: matDesc, amount: matTot, date,
        guestCardId: card.id, workerUserId: finalWorkerId,
      });
    }
    onClose();
  }

  const workerColors = ["var(--color-teal)","var(--color-teal)","var(--color-teal)"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1rem" }}>
        <div className="modal-card" style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem 2.25rem", width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", animation: "fadeInUp 0.3s ease" }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: "1rem", letterSpacing: "0.14em", color: gold, margin: 0 }}>♦ Kártya mentése a receptkönyvbe</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: dim, fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Guest */}
            <div>
              <label style={labelStyle}>Vendég neve</label>
              {!newGuest ? (
                <div style={{ position: "relative" }}>
                  <input value={guestSearch}
                    onChange={e => { setGuestSearch(e.target.value); setGuestOpen(true); setGuestId(""); }}
                    onFocus={() => setGuestOpen(true)}
                    onBlur={() => setTimeout(() => setGuestOpen(false), 150)}
                    placeholder="Keress vendéget…"
                    readOnly={!!prefillGuestId}
                    style={{ ...inputStyle, borderColor: guestId ? "var(--border)" : "var(--border)", opacity: prefillGuestId ? 0.75 : 1 }} />
                  {guestId && <div style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: gold, fontSize: "0.8rem" }}>✓</div>}
                  {guestOpen && !prefillGuestId && (
                    <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", maxHeight: 180, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                      {filtGuests.map(g => (
                        <div key={g.id} onMouseDown={() => { setGuestId(g.id); setGuestSearch(g.name); setGuestOpen(false); }}
                          style={{ padding: "0.55rem 0.9rem", cursor: "pointer", fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: cream, transition: "background 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          {g.name}{g.phone && <span style={{ color: dim, fontSize: "0.8rem", marginLeft: "0.5rem" }}>{g.phone}</span>}
                        </div>
                      ))}
                      <div onMouseDown={() => setNewGuest(true)}
                        style={{ padding: "0.55rem 0.9rem", cursor: "pointer", borderTop: "1px solid var(--bg-highlight)", fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em", color: gold, transition: "background 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        ＋ Új vendég hozzáadása
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Vendég teljes neve" autoFocus style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={() => setNewGuest(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, color: dim, cursor: "pointer", padding: "0 0.75rem", fontSize: "0.8rem" }}>✕</button>
                </div>
              )}
            </div>

            {/* Worker + date */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ki végezte?</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {workers.map((u, i) => {
                    const col = workerColors[i % workerColors.length]!;
                    const sel = workerId === u.id;
                    return (
                      <button key={u.id} type="button" onClick={() => setWorkerId(u.id)}
                        style={{ padding: "0.4rem 0.8rem", borderRadius: 7, cursor: "pointer", border: sel ? `1px solid ${col}88` : "1px solid var(--bg-active)", background: sel ? `${col}18` : "transparent", color: sel ? col : dim, fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", transition: "all 0.2s" }}>
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Dátum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ ...inputStyle, colorScheme: "light" }} />
              </div>
            </div>

            {/* Services */}
            <div>
              <label style={labelStyle}>Elvégzett szolgáltatások</label>
              {selSvcs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  {selSvcs.map((s, i) => {
                    const gColors: Record<string, { border: string; bg: string; text: string }> = {
                      nő:      { border: "rgba(232,180,200,0.7)", bg: "rgba(232,180,200,0.15)", text: "#e8b4c8" },
                      férfi:   { border: "rgba(122,158,200,0.7)", bg: "rgba(122,158,200,0.12)", text: "#7a9ec8" },
                      gyermek: { border: "rgba(167,139,250,0.7)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
                    };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.65rem", background: "var(--bg-active)", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: "var(--color-teal)", flex: 1 }}>{s.name}</span>
                        <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.7rem", color: "var(--color-teal)", opacity: 0.7, fontWeight: 700 }}>{fmt(s.price)}</span>
                        {(["nő", "férfi", "gyermek"] as const).map(g => {
                          const c = gColors[g]!;
                          const active = s.gender === g;
                          return (
                            <button key={g} type="button"
                              onClick={() => setSelSvcs(p => p.map((x, j) => j === i ? { ...x, gender: active ? undefined : g } : x))}
                              style={{ padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${active ? c.border : "var(--border)"}`, background: active ? c.bg : "transparent", color: active ? c.text : "var(--text-dim)", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.09em", cursor: "pointer", transition: "all 0.15s" }}>
                              {g === "nő" ? "Női" : g === "férfi" ? "Férfi" : "Gyermek"}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => setSelSvcs(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input value={svcSearch} onChange={e => { setSvcSearch(e.target.value); setSvcOpen(true); }}
                  onFocus={() => setSvcOpen(true)} onBlur={() => setTimeout(() => setSvcOpen(false), 150)}
                  placeholder="Keress szolgáltatást…" style={inputStyle} />
                {svcOpen && filtSvcs.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 200, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", maxHeight: 180, overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                    {filtSvcs.map((s, i) => {
                      const already = !!selSvcs.find(x => x.name === s.name);
                      const showCat = i === 0 || filtSvcs[i-1]?.categoryName !== s.categoryName;
                      return (
                        <div key={s.id}>
                          {showCat && <div style={{ padding: "0.4rem 0.9rem 0.15rem", fontFamily: "var(--font-cinzel)", fontSize: "0.49rem", letterSpacing: "0.14em", color: "var(--text-dim)", textTransform: "uppercase" }}>{s.categoryName}</div>}
                          <div onMouseDown={() => { if (!already) { setSelSvcs(p => [...p, { uid: crypto.randomUUID(), id: s.id, name: s.name, price: s.price, duration: s.duration ?? 0, categoryName: s.categoryName, hours: 1 }]); setSvcSearch(""); setSvcOpen(false); } }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.9rem", cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1, transition: "background 0.15s" }}
                            onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            {already && <span style={{ color: "var(--color-teal)", fontSize: "0.65rem" }}>✓</span>}
                            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.97rem", color: cream, flex: 1 }}>{s.name}</span>
                            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.8rem", color: "var(--color-teal)", fontWeight: 700 }}>{fmt(s.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Materials / Szín recept */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>✦ Szín recept</label>
                <button type="button" onClick={() => setMatRows(p => [...p, { name: "", brand: "", colorCode: "", grams: "", unitPrice: 0, lineTotal: 0 }])}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--color-teal)", cursor: "pointer", fontSize: "0.7rem", padding: "0.2rem 0.6rem", fontFamily: "var(--font-cinzel)", letterSpacing: "0.1em" }}>
                  ＋ Sor
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {matRows.map((row, i) => (
                  <div key={i} style={{ background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ flex: 2, position: "relative" }}>
                        <input value={row.name}
                          onChange={e => { updateMat(i, "name", e.target.value); setActiveMat(i); setMatSearch(e.target.value); setMatOpen(true); }}
                          onFocus={() => { setActiveMat(i); setMatSearch(row.name); setMatOpen(true); }}
                          onBlur={() => setTimeout(() => setMatOpen(false), 150)}
                          placeholder="Anyag neve…"
                          style={{ ...inputStyle, fontSize: "0.92rem", borderColor: "var(--border)" }} />
                        {matOpen && activeMat === i && filtMat.length > 0 && (
                          <div style={{ position: "absolute", left: 0, right: 0, zIndex: 300, background: "var(--bg-modal)", border: "1px solid var(--border)", borderRadius: 10, marginTop: "0.2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
                            {filtMat.map(m => (
                              <div key={m.name}
                                onMouseDown={() => { updateMat(i, "name", m.name); updateMat(i, "unitPrice", m.unitPrice); setMatSearch(""); setMatOpen(false); }}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.48rem 0.85rem", cursor: "pointer", transition: "background 0.12s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.95rem", color: cream, flex: 1 }}>{m.name}</span>
                                <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.78rem", color: "var(--color-teal)", fontWeight: 700 }}>{m.unitPrice} Ft/{m.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input value={row.brand} onChange={e => updateMat(i, "brand", e.target.value)} placeholder="Márka" style={{ ...inputStyle, flex: 1.2, fontSize: "0.92rem" }} />
                      <input value={row.colorCode} onChange={e => updateMat(i, "colorCode", e.target.value)} placeholder="Színkód" style={{ ...inputStyle, flex: 1, fontSize: "0.92rem" }} />
                      <button type="button" onClick={() => setMatRows(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "0 0.2rem", alignSelf: "center" }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input type="number" value={row.grams} onChange={e => updateMat(i, "grams", e.target.value)} placeholder="Gramm" min="0" step="any"
                        style={{ ...inputStyle, flex: 1, fontSize: "0.9rem", textAlign: "center" }} />
                      <span style={{ fontFamily: "var(--font-cormorant)", color: dim, fontSize: "0.9rem" }}>g ×</span>
                      <span style={{ fontFamily: "var(--font-cormorant)", color: "var(--text-muted)", fontSize: "0.9rem", minWidth: 55 }}>{fmt(row.unitPrice)}</span>
                      <span style={{ color: dim, fontSize: "0.85rem" }}>=</span>
                      <span style={{ fontFamily: "var(--font-playfair)", color: "var(--color-teal)", fontWeight: 700, fontSize: "0.95rem", marginLeft: "auto" }}>{fmt(row.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Megjegyzés (opcionális)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. Hajszín változás, következő időpont…" style={inputStyle} />
            </div>

            {/* Grand total + submit */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", background: "var(--bg-today)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {svcTotal > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--color-teal)" }}>Szolgáltatás: {fmt(svcTotal)}</span>}
                {matTotal > 0 && <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "0.82rem", color: "var(--color-teal)" }}>Anyag: {fmt(matTotal)}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.14em", color: dim }}>
                VÉGÖSSZEG <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.3rem", color: gold, fontWeight: 700, marginLeft: "0.5rem" }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.8rem", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: dim, fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer" }}>Mégse</button>
              <button type="submit" disabled={createCard.isPending || (!guestId && !guestName.trim())} className="btn-gold" style={{ flex: 2, padding: "0.8rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.18em" }}>
                {createCard.isPending ? "Mentés..." : "Mentés a receptkönyvbe ✦"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GuestsClient({ isAdmin = false }: { isAdmin?: boolean }) {
  const utils = api.useUtils();
  const { data: guests = [], isLoading } = api.guests.guestBook.useQuery();
  const deleteCard = api.guests.deleteCard.useMutation({ onSuccess: () => { void utils.guests.guestBook.invalidate(); void utils.calendar.month.invalidate(); } });

  const [showNew,          setShowNew]          = useState(false);
  const [newCardGuestId,   setNewCardGuestId]   = useState<string | undefined>();
  const [newCardGuestName, setNewCardGuestName] = useState<string | undefined>();
  const [search,           setSearch]           = useState("");

  function openNewCard(guestId?: string, guestName?: string) {
    setNewCardGuestId(guestId);
    setNewCardGuestName(guestName);
    setShowNew(true);
  }

  const filtered = (search.trim()
    ? guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : guests
  ).slice().sort((a, b) => a.name.localeCompare(b.name, "hu"));

  function exportAllPdf() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name, "hu"));

    type RowStyle = { fontStyle?: "bold" | "italic" | "normal"; fillColor?: [number,number,number]; textColor?: [number,number,number] | number; fontSize?: number };
    type Row = { content: string; styles?: RowStyle }[];

    const body: Row[] = [];

    sorted.forEach((guest) => {
      const totalSpent = guest.cards.reduce((s: number, c: GuestCardData) => s + c.total, 0);
      const meta = [
        guest.phone ? `Tel: ${guest.phone}` : null,
        `${guest.cards.length} látogatás`,
        `Összköltés: ${totalSpent.toLocaleString("hu-HU")} Ft`,
      ].filter(Boolean).join("   |   ");

      // Guest name row
      body.push([
        { content: guest.name, styles: { fontStyle: "bold", fillColor: [30, 50, 50], textColor: [255, 255, 255], fontSize: 11 } },
        { content: meta,       styles: { fillColor: [30, 50, 50], textColor: [180, 220, 210] as [number,number,number], fontSize: 8 } },
        { content: "",         styles: { fillColor: [30, 50, 50] } },
      ]);

      if (guest.notes) {
        body.push([
          { content: `Megjegyzés: ${guest.notes}`, styles: { fontStyle: "italic", fillColor: [40, 55, 55], textColor: [160, 200, 180] as [number,number,number], fontSize: 8 } },
          { content: "", styles: { fillColor: [40, 55, 55] } },
          { content: "", styles: { fillColor: [40, 55, 55] } },
        ]);
      }

      if (guest.cards.length === 0) {
        body.push([
          { content: "Még nincs rögzített kártya.", styles: { fontStyle: "italic", textColor: 150, fontSize: 9 } },
          { content: "" }, { content: "" },
        ]);
      } else {
        (guest.cards as GuestCardData[]).forEach((card) => {
          const dateLabel = new Date(card.date).toLocaleDateString("hu-HU", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });

          // Date row
          body.push([
            { content: `${dateLabel}  —  ${card.worker.name ?? ""}`, styles: { fontStyle: "bold", fillColor: [50, 70, 70], textColor: [220, 240, 230] as [number,number,number], fontSize: 9 } },
            { content: "", styles: { fillColor: [50, 70, 70] } },
            { content: "", styles: { fillColor: [50, 70, 70] } },
          ]);

          // Services
          card.services.forEach((s) => {
            body.push([
              { content: s.name + (s.gender ? ` (${s.gender})` : ""), styles: { fontSize: 9 } },
              { content: "Szolgáltatás", styles: { fontSize: 8, textColor: 120 } },
              { content: `${s.price.toLocaleString("hu-HU")} Ft`, styles: { fontSize: 9, fontStyle: "bold" } },
            ]);
          });

          // Materials
          card.materials.forEach((m) => {
            const detail = [m.brand, m.colorCode, `${m.grams}g`].filter(Boolean).join(" · ");
            body.push([
              { content: m.name, styles: { fontSize: 9 } },
              { content: detail, styles: { fontSize: 8, textColor: 120 } },
              { content: `${m.lineTotal.toLocaleString("hu-HU")} Ft`, styles: { fontSize: 9 } },
            ]);
          });

          if (card.notes) {
            body.push([
              { content: `Megjegyzés: ${card.notes}`, styles: { fontStyle: "italic", fontSize: 8, textColor: 130 } },
              { content: "" }, { content: "" },
            ]);
          }

          // Total row
          body.push([
            { content: "VÉGÖSSZEG", styles: { fontStyle: "bold", fillColor: [60, 80, 75], textColor: [200, 240, 210] as [number,number,number], fontSize: 9 } },
            { content: "", styles: { fillColor: [60, 80, 75] } },
            { content: `${card.total.toLocaleString("hu-HU")} Ft`, styles: { fontStyle: "bold", fillColor: [60, 80, 75], textColor: [200, 240, 210] as [number,number,number], fontSize: 10 } },
          ]);
        });
      }

      // Spacer between guests
      body.push([{ content: "" }, { content: "" }, { content: "" }]);
    });

    autoTable(doc, {
      head: [["Vendég / Szolgáltatás", "Részletek", "Összeg (Ft)"]],
      body,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [20, 40, 40], textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 65 },
        2: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 15, right: 15, top: 15 },
    });

    const today = new Date().toISOString().slice(0, 10);
    doc.save(`receptkonyv_${today}.pdf`);
  }

  return (
    <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 760 }}>
      {showNew && (
        <NewCardModal
          prefillGuestId={newCardGuestId}
          prefillGuestName={newCardGuestName}
          onClose={() => { setShowNew(false); setNewCardGuestId(undefined); setNewCardGuestName(undefined); }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem", color: "var(--color-teal)", animation: "float 4s ease-in-out infinite", margin: 0 }}>Vendég receptkönyv ♦</h1>
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", color: "var(--color-pink)", opacity: 0.75, fontStyle: "italic", margin: "0.3rem 0 0" }}>Minden vendég szín receptje és látogatási előzménye</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0, alignItems: "center" }}>
          {guests.length > 0 && (
            <button onClick={exportAllPdf}
              style={{ padding: "0.75rem 1.25rem", borderRadius: 10, border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", color: "#c9a84c", fontFamily: "var(--font-cinzel)", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)"; }}>
              📄 PDF exportálás
            </button>
          )}
        <button onClick={() => openNewCard()}
          className="btn-gold" style={{ padding: "0.75rem 1.5rem", borderRadius: 10, fontFamily: "var(--font-cinzel)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", flexShrink: 0 }}>
          ＋ Új kártya
        </button>
        </div>
      </div>

      {guests.length > 0 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keress vendég neve szerint…"
          style={{ ...inputStyle, marginBottom: "1.25rem", maxWidth: 340 }} />
      )}

      {isLoading ? (
        <div style={{ color: dim, fontFamily: "var(--font-cormorant)", textAlign: "center", padding: "3rem" }}>Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)", border: "1px dashed var(--border)", borderRadius: 16 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>♦</div>
          <div style={{ fontFamily: "var(--font-cinzel)", color: gold, fontSize: "0.85rem", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>Még nincs vendég a receptkönyvben</div>
          <div style={{ fontFamily: "var(--font-cormorant)", color: dim }}>Hozd létre az első kártyát az "＋ Új kártya" gombbal.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(guest => (
            <GuestRow key={guest.id} guest={guest as GuestWithCards} isAdmin={isAdmin}
              onDeleteCard={id => deleteCard.mutate({ id })}
              onNewCard={(gId, gName) => openNewCard(gId, gName)} />
          ))}
        </div>
      )}
    </div>
  );
}
