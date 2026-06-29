"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

const LS_KEY = "salon_pdf_last_download";
const DEADLINE_DAYS = 30;

function daysRemaining(): number {
  if (typeof window === "undefined") return DEADLINE_DAYS;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return 0; // sosem töltötték le → azonnal piros
  const last = new Date(raw).getTime();
  const diff = Math.floor((Date.now() - last) / 86_400_000);
  return Math.max(0, DEADLINE_DAYS - diff);
}

function CountdownBadge({ days }: { days: number }) {
  let bg: string, color: string, label: string;
  if (days === 0) {
    bg = "rgba(180,40,40,0.14)"; color = "#c04040";
    label = "Lejárt!";
  } else if (days <= 7) {
    bg = "rgba(180,110,20,0.14)"; color = "#b06010";
    label = `${days} nap`;
  } else {
    bg = "rgba(40,120,70,0.12)"; color = "#2a7848";
    label = `${days} nap`;
  }
  return (
    <div title={`Utolsó PDF letöltés óta: ${DEADLINE_DAYS - days} nap`} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minWidth: 52, padding: "0.3rem 0.6rem",
      borderRadius: 8, border: `1px solid ${color}55`,
      background: bg,
    }}>
      <span style={{ fontFamily: "var(--font-playfair)", fontSize: "0.95rem", fontWeight: 700, color, lineHeight: 1.1 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.38rem", letterSpacing: "0.12em", color, opacity: 0.75, textTransform: "uppercase", marginTop: 1 }}>maradt</span>
    </div>
  );
}

const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

function fmt(n: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);
}

export default function PdfExportButton({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<number>(DEADLINE_DAYS);
  const year = new Date().getFullYear();

  useEffect(() => { setDays(daysRemaining()); }, []);

  const { data: yearMonths = [] }  = api.finance.yearSummary.useQuery({ year });
  const { data: perUser   = [] }  = api.finance.perUserYear.useQuery({ year }, { enabled: isAdmin });
  const { data: allEntries = [] } = api.finance.list.useQuery({ year, month: new Date().getMonth() + 1 });

  async function handleExport() {
    setLoading(true);
    try {
      // Dynamic import — only loaded when the button is clicked
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const now = new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });

      // ── Header ────────────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(80, 50, 20);
      doc.text("Salon Spellbook", W / 2, 18, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(120, 80, 40);
      doc.text(`Pénzügyi kimutatás — ${year}`, W / 2, 26, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(160, 120, 70);
      doc.text(`Generálva: ${now}`, W / 2, 32, { align: "center" });

      doc.setDrawColor(180, 140, 60);
      doc.setLineWidth(0.4);
      doc.line(14, 35, W - 14, 35);

      let y = 42;

      // ── Éves havi összesítő ──────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60, 40, 10);
      doc.text(`Havi összesítő — ${year}`, 14, y);
      y += 6;

      const yearTotal = { revenue: 0, material: 0, wage: 0 };
      const monthRows = yearMonths.map((m, i) => {
        const becsultBer = m.wage > 0 ? m.wage : Math.round(m.revenue * 0.6);
        const profit = m.revenue - m.material - becsultBer;
        yearTotal.revenue  += m.revenue;
        yearTotal.material += m.material;
        yearTotal.wage     += becsultBer;
        return [
          MONTHS[i]!,
          fmt(m.revenue),
          fmt(m.material),
          fmt(becsultBer),
          fmt(profit),
        ];
      });

      const totalBer = yearTotal.wage;
      const totalProfit = yearTotal.revenue - yearTotal.material - totalBer;

      autoTable(doc, {
        startY: y,
        head: [["Hónap", "Bevétel", "Anyagköltség", "Bérek (becsült)", "Nyereség"]],
        body: [
          ...monthRows,
          ["ÖSSZESEN", fmt(yearTotal.revenue), fmt(yearTotal.material), fmt(totalBer), fmt(totalProfit)],
        ],
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [120, 80, 30], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 220, 180], textColor: [60, 30, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [252, 246, 234] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        didParseCell(data) {
          // Color the profit column
          if (data.column.index === 4 && data.section === "body") {
            const val = data.cell.raw as string;
            const num = parseFloat(val.replace(/[^0-9-]/g, ""));
            data.cell.styles.textColor = num >= 0 ? [30, 100, 60] : [160, 40, 40];
          }
          // Bold total row
          if (data.row.index === monthRows.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [235, 210, 155];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // ── Dolgozók bontása (admin only) ────────────────────────────────────
      if (isAdmin && perUser.length > 0) {
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

        if (y > 240) { doc.addPage(); y = 20; }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(60, 40, 10);
        doc.text(`Dolgozók éves összesítője — ${year}`, 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Dolgozó", "Bevétel", "Anyagköltség", "Becsült bér (60%)", "Hozzájárulás"]],
          body: perUser.map(u => {
            const becsultBer = u.wage > 0 ? u.wage : Math.round(u.revenue * 0.6);
            return [
              u.name,
              fmt(u.revenue),
              fmt(u.material),
              fmt(becsultBer),
              fmt(u.revenue - becsultBer - u.material),
            ];
          }),
          styles: { font: "helvetica", fontSize: 9 },
          headStyles: { fillColor: [70, 50, 120], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [244, 240, 255] },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Aktuális havi bejegyzések ─────────────────────────────────────────
      if (allEntries.length > 0) {
        const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        let ey = lastY + 10;
        if (ey > 240) { doc.addPage(); ey = 20; }

        const monthLabel = MONTHS[new Date().getMonth()];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(60, 40, 10);
        doc.text(`${monthLabel} — részletes bejegyzések`, 14, ey);
        ey += 6;

        const TYPE_HU: Record<string, string> = { revenue: "Bevétel", material: "Anyag", wage: "Bér" };

        autoTable(doc, {
          startY: ey,
          head: [["Dátum", "Típus", "Leírás", "Összeg"]],
          body: allEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(e => [
              new Date(e.date).toLocaleDateString("hu-HU", { timeZone: "UTC", month: "short", day: "numeric" }),
              TYPE_HU[e.type] ?? e.type,
              (e.description ?? "").slice(0, 55),
              fmt(e.amount),
            ]),
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [50, 90, 70], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 244] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 20 },
            2: { cellWidth: "auto" },
            3: { halign: "right", cellWidth: 28 },
          },
          didParseCell(data) {
            if (data.column.index === 1 && data.section === "body") {
              const v = data.cell.raw as string;
              if (v === "Bevétel")  data.cell.styles.textColor = [30, 100, 60];
              if (v === "Anyag")    data.cell.styles.textColor = [140, 70, 10];
              if (v === "Bér")      data.cell.styles.textColor = [80, 50, 140];
            }
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Footer on all pages ───────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(180, 150, 100);
        doc.text(`Salon Spellbook — ${now}`, 14, 290);
        doc.text(`${i} / ${pageCount}`, W - 14, 290, { align: "right" });
      }

      doc.save(`salon-kimutatás-${year}.pdf`);
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setDays(DEADLINE_DAYS);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <CountdownBadge days={days} />
      <button
        onClick={handleExport}
        disabled={loading}
        title={`PDF letöltése — utolsó mentés: ${DEADLINE_DAYS - days} napja`}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1rem",
          borderRadius: 9,
          border: days === 0
            ? "1px solid rgba(180,40,40,0.5)"
            : "1px solid rgba(160,104,48,0.35)",
          background: days === 0
            ? "rgba(180,40,40,0.09)"
            : loading ? "rgba(160,104,48,0.08)" : "rgba(160,104,48,0.06)",
          color: days === 0 ? "#c04040" : loading ? "var(--text-dim)" : "var(--color-teal)",
          fontFamily: "var(--font-cinzel)",
          fontSize: "0.56rem",
          letterSpacing: "0.1em",
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
          animation: days === 0 ? "goldPulse 2s ease-in-out infinite" : "none",
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = days === 0 ? "rgba(180,40,40,0.18)" : "rgba(160,104,48,0.14)"; }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = days === 0 ? "rgba(180,40,40,0.09)" : "rgba(160,104,48,0.06)"; }}
      >
        {loading ? "⏳ Generálás..." : "⬇ PDF letöltés"}
      </button>
    </div>
  );
}
