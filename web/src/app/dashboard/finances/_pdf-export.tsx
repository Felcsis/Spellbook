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

const MONTHS = ["Januar","Februar","Marcius","Aprilis","Majus","Junius","Julius","Augusztus","Szeptember","Oktober","November","December"];

// jsPDF's built-in Helvetica does not support Hungarian special chars (ő, ű, á, é, etc.)
// so we normalize them to ASCII equivalents for PDF output.
function deHu(s: string): string {
  return s
    .replace(/[áÁ]/g, m => m === "á" ? "a" : "A")
    .replace(/[éÉ]/g, m => m === "é" ? "e" : "E")
    .replace(/[íÍ]/g, m => m === "í" ? "i" : "I")
    .replace(/[óÓ]/g, m => m === "ó" ? "o" : "O")
    .replace(/[öÖőŐ]/g, m => m.toLowerCase() === m ? "o" : "O")
    .replace(/[úÚ]/g, m => m === "ú" ? "u" : "U")
    .replace(/[üÜűŰ]/g, m => m.toLowerCase() === m ? "u" : "U");
}

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
      const nowDate = new Date();
      const nowLabel = `${nowDate.getFullYear()}. ${MONTHS[nowDate.getMonth()]} ${nowDate.getDate()}.`;

      // ── Header ────────────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(80, 50, 20);
      doc.text("Salon Spellbook", W / 2, 18, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(120, 80, 40);
      doc.text(`Penzugyi kimutatas — ${year}`, W / 2, 26, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(160, 120, 70);
      doc.text(`Generalva: ${nowLabel}`, W / 2, 32, { align: "center" });

      doc.setDrawColor(180, 140, 60);
      doc.setLineWidth(0.4);
      doc.line(14, 35, W - 14, 35);

      let y = 42;

      // ── Havi osszesito ───────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(60, 40, 10);
      doc.text(`Havi osszesito — ${year}`, 14, y);
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
        head: [["Honap", "Bevetel", "Anyagkoltseg", "Berek (becsult)", "Nyereseg"]],
        body: [
          ...monthRows,
          ["OSSZESEN", fmt(yearTotal.revenue), fmt(yearTotal.material), fmt(totalBer), fmt(totalProfit)],
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
        doc.text(`Dolgozok eves osszesitoje — ${year}`, 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Dolgozo", "Bevetel", "Anyagkoltseg", "Becsult ber (60%)", "Hozzajarulas"]],
          body: perUser.map(u => {
            const becsultBer = u.wage > 0 ? u.wage : Math.round(u.revenue * 0.6);
            return [
              deHu(u.name ?? ""),
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
        doc.text(`${monthLabel} — reszletes bejegyzesek`, 14, ey);
        ey += 6;

        const TYPE_HU: Record<string, string> = { revenue: "Bevetel", material: "Anyag", wage: "Ber" };

        autoTable(doc, {
          startY: ey,
          head: [["Datum", "Tipus", "Leiras", "Osszeg"]],
          body: allEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(e => {
              const d = new Date(e.date);
              const dateLabel = `${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`;
              return [
                dateLabel,
                TYPE_HU[e.type] ?? e.type,
                deHu((e.description ?? "").slice(0, 55)),
                fmt(e.amount),
              ];
            }),
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
              if (v === "Bevetel") data.cell.styles.textColor = [30, 100, 60];
              if (v === "Anyag")   data.cell.styles.textColor = [140, 70, 10];
              if (v === "Ber")     data.cell.styles.textColor = [80, 50, 140];
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
        doc.text(`Salon Spellbook — ${nowLabel}`, 14, 290);
        doc.text(`${i} / ${pageCount}`, W - 14, 290, { align: "right" });
      }

      doc.save(`salon-kimutatas-${year}.pdf`);
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
