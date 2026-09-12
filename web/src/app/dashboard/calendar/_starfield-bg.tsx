// Csillagtérkép háttér a naptárhoz.
//
// Mindkét témában működnie kell: sötétben ragyogó éjszakai égbolt, világosban
// pergamenre rajzolt csillagtérkép szépiával. Ezért minden szín a téma-változókból
// jön, és a fényerőt csak az áttetszőség adja.
//
// A csillagok helye determinisztikus (saját kis generátor), különben a szerveren
// és a böngészőben más kerülne ki, és a React hidratálási hibát dobna.

/** Kicsi determinisztikus generátor — ugyanaz az égbolt minden betöltéskor. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

type Star = { x: number; y: number; r: number; o: number; delay: number };

const STARS: Star[] = (() => {
  const rnd = seeded(20260913);
  return Array.from({ length: 90 }, () => ({
    x:     rnd() * 100,
    y:     rnd() * 100,
    r:     0.6 + rnd() * 1.6,
    o:     0.25 + rnd() * 0.55,
    delay: rnd() * 6,
  }));
})();

/** Néhány halvány konstelláció-vonal, hogy térkép legyen, ne csak pontfelhő. */
const LINES: [number, number, number, number][] = [
  [12, 18, 22, 26], [22, 26, 31, 16], [31, 16, 42, 23],
  [64, 12, 73, 20], [73, 20, 81, 14],
  [18, 72, 27, 80], [27, 80, 37, 74], [37, 74, 44, 84],
  [70, 66, 79, 73], [79, 73, 88, 64],
];

export function StarfieldBg() {
  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden",
    }}>
      {/* Két lassan úszó ködfolt adja a mélységet */}
      <div style={{
        position: "absolute", top: "-15%", left: "-10%", width: "60%", height: "60%",
        background: "radial-gradient(circle, var(--bg-highlight) 0%, transparent 70%)",
        filter: "blur(70px)", animation: "nebulaFloat 26s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-10%", width: "55%", height: "55%",
        background: "radial-gradient(circle, var(--bg-highlight) 0%, transparent 70%)",
        filter: "blur(80px)", animation: "nebulaFloat 32s ease-in-out -12s infinite",
      }} />

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, color: "var(--color-teal)" }}>
        {LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor" strokeWidth="0.08" opacity="0.18" />
        ))}
      </svg>

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, color: "var(--color-teal)" }}>
        {STARS.map((s, i) => (
          // Az alap fényerő fill-opacity, a pislákolás CSS opacity — a kettő szorzódik.
          <circle key={i} cx={s.x} cy={s.y} r={s.r / 10} fill="currentColor" fillOpacity={s.o}
            style={{ animation: `starPulse ${5 + (i % 5)}s ease-in-out ${s.delay}s infinite` }} />
        ))}
      </svg>
    </div>
  );
}
