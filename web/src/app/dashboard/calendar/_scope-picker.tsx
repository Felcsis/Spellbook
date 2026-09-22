"use client";

/**
 * „Mire lehet kérni” — a foglalható sáv szolgáltatás-szűrése.
 *
 * Kategória egészben és egyedi tétel is jelölhető: a délelőtt mehet „Férfi
 * hajvágás”-ra, és mellé jelölhető két külön festés is. Semmit nem jelölve a
 * sáv bármire kérhető — ez a leggyakoribb, ezért ez az alapállapot.
 *
 * Két helyen kell: a kézi megadásnál és a naptárba húzott sávnál. Egy
 * példányban él, hogy a két helyen ne csússzon el egymástól a viselkedése.
 */

import { useState } from "react";
import { api } from "~/trpc/react";

export type Scope = { cats: string[]; svcs: string[] };

export const EMPTY_SCOPE: Scope = { cats: [], svcs: [] };

export function scopeCount(s: Scope) {
  return s.cats.length + s.svcs.length;
}

export function ScopePicker({ listType, value, onChange, maxHeight = 190 }: {
  /** A dolgozó árlistája — a másik lista tételeit fel se kínáljuk. */
  listType?: string;
  value: Scope;
  onChange: (s: Scope) => void;
  maxHeight?: number;
}) {
  const [openCat, setOpenCat] = useState<string | null>(null);
  const { data: allCategories = [] } = api.calendar.services.useQuery();

  const categories = listType
    ? allCategories.filter(c => c.priceListType === listType)
    : allCategories;

  const { cats, svcs } = value;

  /** A kategória állapota: egészben kiadva, néhány tétele, vagy semmi. */
  function catState(c: { id: string; services: { id: string }[] }) {
    if (cats.includes(c.id)) return "mind" as const;
    return c.services.some(s => svcs.includes(s.id)) ? "reszben" as const : "nincs" as const;
  }

  function toggleCat(c: { id: string; services: { id: string }[] }) {
    const ids = c.services.map(s => s.id);
    if (cats.includes(c.id)) {
      onChange({ cats: cats.filter(id => id !== c.id), svcs });
    } else {
      // A kategória egészben tartalmazza a tételeit: a külön jelöltek feleslegessé válnak.
      onChange({ cats: [...cats, c.id], svcs: svcs.filter(id => !ids.includes(id)) });
    }
  }

  function toggleSvc(catId: string, id: string, siblingIds: string[]) {
    // Ha a kategória egészben ki volt adva, tételenkéntire bontjuk — különben a
    // pipa levétele látszólag nem csinálna semmit.
    if (cats.includes(catId)) {
      onChange({
        cats: cats.filter(c => c !== catId),
        svcs: [...new Set([...svcs, ...siblingIds])].filter(s => s !== id),
      });
      return;
    }
    onChange({ cats, svcs: svcs.includes(id) ? svcs.filter(s => s !== id) : [...svcs, id] });
  }

  return (
    <div style={{
      maxHeight, overflowY: "auto", borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--bg-panel)", padding: "0.3rem",
    }}>
      {categories.map(c => {
        const state = catState(c);
        const open  = openCat === c.id;
        const ids   = c.services.map(s => s.id);
        return (
          <div key={c.id} style={{ marginBottom: "0.15rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button type="button" onClick={() => toggleCat(c)}
                style={{
                  flex: 1, textAlign: "left", cursor: "pointer", borderRadius: 7,
                  padding: "0.3rem 0.5rem",
                  border: state === "nincs" ? "1px solid transparent" : "1px solid var(--border-strong)",
                  background: state === "mind" ? "var(--bg-active)" : "transparent",
                  color: state === "nincs" ? "var(--text-soft)" : "var(--color-teal)",
                  fontFamily: "var(--font-cormorant)", fontSize: "0.92rem",
                }}>
                {state === "mind" ? "◉" : state === "reszben" ? "◐" : "○"} {c.name}
                {state === "reszben" && (
                  <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                    {" "}· {c.services.filter(x => svcs.includes(x.id)).length} tétel
                  </span>
                )}
              </button>
              <button type="button" onClick={() => setOpenCat(open ? null : c.id)}
                title="Tételenként"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-dim)", fontSize: "0.8rem", padding: "0.2rem 0.3rem",
                }}>
                {open ? "▴" : "▾"}
              </button>
            </div>

            {open && (
              <div style={{ paddingLeft: "1.1rem" }}>
                {c.services.map(sv => {
                  const on = cats.includes(c.id) || svcs.includes(sv.id);
                  return (
                    <button key={sv.id} type="button" onClick={() => toggleSvc(c.id, sv.id, ids)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                        background: "none", border: "none", padding: "0.2rem 0.4rem",
                        color: on ? "var(--color-teal)" : "var(--text-dim)",
                        fontFamily: "var(--font-cormorant)", fontSize: "0.88rem",
                      }}>
                      {on ? "✓" : "·"} {sv.name}
                      <span style={{ color: "var(--text-dim)" }}> · {sv.duration} perc</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
