"use client";

/**
 * Kis havi naptár — napválasztóhoz.
 *
 * Két helyen használjuk: a napi nézet oldalsávjában (ugrás egy napra) és a
 * foglalás-ablakban (melyik napra keressünk szabad időt). Ezért nem tud semmit
 * a naptár többi részéről: a jelölendő napokat kívülről kapja.
 */

import { useState } from "react";

const DAYS_S = ["H", "K", "Sz", "Cs", "P", "Szo", "V"];
const MONTHS = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December",
];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MiniCalendar({ selected, onSelect, marked = {}, minDate }: {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Napokhoz rendelt jelölés: dátum → szín. Pl. ahol van szabad idő vagy foglalás. */
  marked?: Record<string, string>;
  /** Ennél korábbi nap nem választható (a foglalásnál a múlt). */
  minDate?: Date;
}) {
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const daysInMonth  = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startOffset  = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr    = toDateStr(new Date());
  const selectedStr = toDateStr(selected);
  const minStr      = minDate ? toDateStr(minDate) : null;

  const nav = (dir: -1 | 1) =>
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1));

  return (
    <div style={{
      background: "var(--bg-panel)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "0.6rem 0.7rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <button type="button" onClick={() => nav(-1)} style={navBtn}>‹</button>
        <span style={{
          fontFamily: "var(--font-cinzel)", fontSize: "0.58rem", letterSpacing: "0.1em",
          color: "var(--color-teal)", textTransform: "uppercase",
        }}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </span>
        <button type="button" onClick={() => nav(1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {DAYS_S.map(d => (
          <div key={d} style={{
            textAlign: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.42rem",
            letterSpacing: "0.06em", color: "var(--text-dim)", padding: "0.15rem 0",
          }}>{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const d   = new Date(month.getFullYear(), month.getMonth(), day);
          const ds  = toDateStr(d);
          const isSelected = ds === selectedStr;
          const isToday    = ds === todayStr;
          const disabled   = minStr ? ds < minStr : false;
          const mark       = marked[ds];

          return (
            <button key={ds} type="button" disabled={disabled}
              onClick={() => onSelect(d)}
              style={{
                position: "relative", aspectRatio: "1", border: "none", borderRadius: 6,
                cursor: disabled ? "default" : "pointer",
                background: isSelected ? "var(--color-teal)" : isToday ? "var(--bg-active)" : "transparent",
                color: isSelected ? "var(--color-bg)"
                     : disabled   ? "var(--text-dim)"
                     : isToday    ? "var(--color-teal)" : "var(--text-primary)",
                opacity: disabled ? 0.35 : 1,
                fontFamily: "var(--font-playfair)", fontSize: "0.72rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}>
              {day}
              {mark && !isSelected && (
                <span style={{
                  position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: "50%", background: mark,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text-soft)", fontSize: "0.95rem", lineHeight: 1, padding: "0 0.3rem",
};
