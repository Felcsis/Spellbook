// Sage herb grimoire background for Services / Árlista
// Elements: sage bundle, corked herb jars, open book, mortar & pestle, hanging herbs, crescent moons

const SEPIA = "var(--color-teal)";
const GREEN = "#4a6830"; // sage forest green

/** Tied sage bundle with smoke */
function SageBundle({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Smoke wisps above */}
      <path d="M48 8 Q44 2 48 -4 Q52 -10 48 -16" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.35" strokeLinecap="round"/>
      <path d="M54 10 Q58 4 54 -2 Q50 -8 54 -14" stroke="currentColor" strokeWidth="1"   fill="none" opacity="0.28" strokeLinecap="round"/>
      <path d="M42 12 Q38 6 42 0"                 stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.24" strokeLinecap="round"/>

      {/* Individual sage stems — fanning out from tie */}
      {/* Far left */}
      <path d="M46 130 Q30 100 22 60 Q18 38 20 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Left */}
      <path d="M47 130 Q34 102 28 68 Q24 44 26 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Center-left */}
      <path d="M48 130 Q40 104 36 72 Q34 50 36 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Center */}
      <path d="M50 130 Q48 106 48 72 Q48 50 48 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Center-right */}
      <path d="M52 130 Q60 104 64 72 Q66 50 64 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Right */}
      <path d="M53 130 Q66 102 72 68 Q76 44 74 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Far right */}
      <path d="M54 130 Q70 100 78 60 Q82 38 80 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>

      {/* Sage leaves — elongated ovals along stems */}
      {/* Center stem leaves */}
      <path d="M48 50 Q36 44 32 32 Q40 40 48 50"  fill={GREEN} fillOpacity="0.35" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 50 Q60 44 64 32 Q56 40 48 50"  fill={GREEN} fillOpacity="0.35" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 70 Q35 62 30 48 Q38 58 48 70"  fill={GREEN} fillOpacity="0.32" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 70 Q61 62 66 48 Q58 58 48 70"  fill={GREEN} fillOpacity="0.32" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 90 Q36 82 32 68 Q40 78 48 90"  fill={GREEN} fillOpacity="0.30" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 90 Q60 82 64 68 Q56 78 48 90"  fill={GREEN} fillOpacity="0.30" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 110 Q36 102 32 88 Q40 98 48 110" fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M48 110 Q60 102 64 88 Q56 98 48 110" fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="0.9"/>
      {/* Left stem leaves */}
      <path d="M28 56 Q16 50 12 38" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.55" fill={GREEN} fillOpacity="0.20"/>
      <path d="M28 76 Q16 70 12 58" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.50" fill={GREEN} fillOpacity="0.18"/>
      <path d="M28 96 Q18 90 14 78" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      {/* Right stem leaves */}
      <path d="M72 56 Q84 50 88 38" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.55" fill={GREEN} fillOpacity="0.20"/>
      <path d="M72 76 Q84 70 88 58" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.50" fill={GREEN} fillOpacity="0.18"/>
      <path d="M72 96 Q82 90 86 78" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>

      {/* Tie / binding at middle */}
      <path d="M34 134 Q50 128 66 134 Q50 140 34 134 Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M36 138 Q50 133 64 138" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M38 142 Q50 138 62 142" stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.60"/>
      {/* Bow */}
      <path d="M38 132 Q26 122 30 112 Q36 106 44 114 Q46 122 44 132" fill={GREEN} fillOpacity="0.20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M62 132 Q74 122 70 112 Q64 106 56 114 Q54 122 56 132" fill={GREEN} fillOpacity="0.20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <ellipse cx="50" cy="130" rx="7" ry="4.5" fill="currentColor" opacity="0.62"/>
      {/* Ribbon tails */}
      <path d="M46 134 Q42 148 44 160" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M54 134 Q58 148 56 160" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>

      {/* Lower stems bundle */}
      <path d="M50 160 Q48 178 50 200" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.70"/>
      <path d="M50 200 Q48 210 50 220" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );
}

/** Small corked herb jar */
function HerbJar({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 55 85" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cork */}
      <path d="M18 6 Q27.5 3 37 6 L36 18 Q27.5 15 19 18 Z"
        fill="currentColor" fillOpacity="0.78" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="18" y1="10" x2="37" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.28"/>
      <line x1="18" y1="14" x2="37" y2="14" stroke="currentColor" strokeWidth="0.5" opacity="0.28"/>
      {/* Neck */}
      <rect x="20" y="18" width="15" height="10" rx="1" fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.3"/>
      {/* Jar body — slightly wider than neck */}
      <path d="M14 28 Q12 30 12 50 Q12 72 27.5 76 Q43 72 43 50 Q43 30 41 28 Z"
        fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.6"/>
      {/* Herb contents — small sage sprigs inside */}
      <path d="M27 60 Q20 50 18 38 Q22 46 27 60" fill={GREEN} fillOpacity="0.30" stroke={GREEN} strokeWidth="0.8"/>
      <path d="M27 60 Q34 50 36 38 Q32 46 27 60" fill={GREEN} fillOpacity="0.28" stroke={GREEN} strokeWidth="0.8"/>
      <path d="M27 55 Q22 46 20 34" stroke={GREEN} strokeWidth="1"  strokeLinecap="round" opacity="0.55"/>
      <path d="M27 55 Q32 46 34 34" stroke={GREEN} strokeWidth="1"  strokeLinecap="round" opacity="0.55"/>
      <path d="M24 45 Q18 40 16 32" stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      <path d="M30 45 Q36 40 38 32" stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      {/* Glass shine */}
      <path d="M15 36 Q16 28 18 26" stroke="currentColor" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/>
      {/* Label */}
      <rect x="18" y="54" width="19" height="12" rx="2" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="20" y1="58" x2="35" y2="58" stroke="currentColor" strokeWidth="0.7" opacity="0.30"/>
      <line x1="20" y1="62" x2="32" y2="62" stroke="currentColor" strokeWidth="0.7" opacity="0.26"/>
    </svg>
  );
}

/** Open spell book / grimoire */
function OpenBook({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 130 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left page */}
      <path d="M65 10 Q40 6 10 10 L6 82 Q34 78 65 82 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5"/>
      {/* Right page */}
      <path d="M65 10 Q90 6 120 10 L124 82 Q96 78 65 82 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5"/>
      {/* Spine */}
      <line x1="65" y1="10" x2="65" y2="82" stroke="currentColor" strokeWidth="2" opacity="0.55"/>
      {/* Left page curl at top */}
      <path d="M65 10 Q52 8 40 10" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
      {/* Text lines — left page */}
      <line x1="14" y1="22" x2="60" y2="20" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="14" y1="30" x2="60" y2="28" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="14" y1="38" x2="60" y2="36" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="14" y1="46" x2="60" y2="44" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <line x1="14" y1="54" x2="60" y2="52" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <line x1="14" y1="62" x2="55" y2="60" stroke="currentColor" strokeWidth="0.9" opacity="0.26"/>
      <line x1="14" y1="70" x2="48" y2="68" stroke="currentColor" strokeWidth="0.9" opacity="0.22"/>
      {/* Text lines — right page */}
      <line x1="70" y1="22" x2="116" y2="20" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="70" y1="30" x2="116" y2="28" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="70" y1="38" x2="116" y2="36" stroke="currentColor" strokeWidth="0.9" opacity="0.35"/>
      <line x1="70" y1="46" x2="116" y2="44" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <line x1="70" y1="54" x2="116" y2="52" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <line x1="70" y1="62" x2="110" y2="60" stroke="currentColor" strokeWidth="0.9" opacity="0.26"/>
      {/* Decorative initial / symbol on left page */}
      <text x="16" y="18" fontSize="9" fill={GREEN} opacity="0.65" fontFamily="serif">✦</text>
      {/* Small sage sprig illustration on right page */}
      <path d="M88 48 Q84 42 82 34" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M88 48 Q92 42 94 34" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M85 40 Q80 36 78 28" stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      <path d="M91 40 Q96 36 98 28" stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      {/* Page shadow at spine */}
      <path d="M60 12 Q62 46 60 80" stroke="currentColor" strokeWidth="0.8" opacity="0.20"/>
      <path d="M70 12 Q68 46 70 80" stroke="currentColor" strokeWidth="0.8" opacity="0.20"/>
      {/* Book cover edges */}
      <path d="M6 82 Q4 86 6 88 L124 88 Q126 86 124 82" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

/** Mortar and pestle with herbs */
function MortarPestle({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 90 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pestle handle */}
      <path d="M62 8 Q66 18 64 32 Q62 38 58 42"
        stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.75"/>
      {/* Pestle head */}
      <ellipse cx="57" cy="44" rx="7" ry="5" fill="currentColor" fillOpacity="0.55" stroke="currentColor" strokeWidth="1.2"/>
      {/* Mortar bowl */}
      <path d="M10 42 Q10 68 45 72 Q80 68 80 42 Z"
        fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.8"/>
      {/* Bowl rim */}
      <ellipse cx="45" cy="42" rx="35" ry="9"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5"/>
      {/* Herb contents visible in bowl */}
      <path d="M32 38 Q28 32 26 24" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" opacity="0.60"/>
      <path d="M32 38 Q36 32 38 24" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" opacity="0.60"/>
      <path d="M44 36 Q40 28 38 18" stroke={GREEN} strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      <path d="M44 36 Q48 28 50 18" stroke={GREEN} strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      <path d="M30 30 Q26 24 24 16" stroke={GREEN} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      {/* Leaf shapes */}
      <path d="M32 38 Q24 34 20 26 Q26 32 32 38" fill={GREEN} fillOpacity="0.28" stroke={GREEN} strokeWidth="0.7"/>
      <path d="M44 36 Q36 30 34 20 Q40 28 44 36" fill={GREEN} fillOpacity="0.25" stroke={GREEN} strokeWidth="0.7"/>
      {/* Bowl foot */}
      <rect x="30" y="70" width="30" height="5" rx="2.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

/** Drying herbs hanging on a stick */
function HangingHerbs({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Horizontal stick / rod */}
      <line x1="4" y1="8" x2="156" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.70"/>
      {/* Knot bumps on stick */}
      <circle cx="30"  cy="8" r="3.5" fill="currentColor" opacity="0.45"/>
      <circle cx="80"  cy="8" r="3"   fill="currentColor" opacity="0.40"/>
      <circle cx="130" cy="8" r="3.5" fill="currentColor" opacity="0.45"/>

      {/* Bundle 1 — left */}
      <line x1="28" y1="8" x2="28" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M20 28 Q24 18 28 22 Q32 18 36 28 Q28 32 20 28 Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2"/>
      {[16,20,24,28,32,36,40].map((x, i) => (
        <path key={i} d={`M${x} 32 Q${x-4} 52 ${x-2} 68 Q${x+2} 52 ${x+4} 68`}
          stroke={GREEN} strokeWidth="1.1" fill={GREEN} fillOpacity="0.20" strokeLinecap="round" opacity="0.65"/>
      ))}
      <path d="M18 30 Q28 27 38 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.60"/>

      {/* Bundle 2 — center */}
      <line x1="80" y1="8" x2="80" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M72 28 Q76 18 80 22 Q84 18 88 28 Q80 32 72 28 Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2"/>
      {[68,72,76,80,84,88,92].map((x, i) => (
        <path key={i} d={`M${x} 32 Q${x-4} 52 ${x-2} 66 Q${x+2} 52 ${x+4} 66`}
          stroke={GREEN} strokeWidth="1.1" fill={GREEN} fillOpacity="0.20" strokeLinecap="round" opacity="0.65"/>
      ))}
      <path d="M70 30 Q80 27 90 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.60"/>

      {/* Bundle 3 — right */}
      <line x1="132" y1="8" x2="132" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M124 28 Q128 18 132 22 Q136 18 140 28 Q132 32 124 28 Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2"/>
      {[120,124,128,132,136,140,144].map((x, i) => (
        <path key={i} d={`M${x} 32 Q${x-4} 50 ${x-2} 64 Q${x+2} 50 ${x+4} 64`}
          stroke={GREEN} strokeWidth="1.1" fill={GREEN} fillOpacity="0.20" strokeLinecap="round" opacity="0.65"/>
      ))}
      <path d="M122 30 Q132 27 142 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.60"/>
    </svg>
  );
}

/** Large sage flower head — purple spiky bloom */
function SageFlower({ width, height }: { width: number; height: number }) {
  const PURPLE = "#7a60a8";
  return (
    <svg width={width} height={height} viewBox="0 0 140 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main stem */}
      <path d="M70 178 Q68 150 70 110 Q72 80 70 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Side branches */}
      <path d="M70 90 Q50 80 38 62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M70 90 Q90 80 102 62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M70 120 Q52 112 42 96" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M70 120 Q88 112 98 96" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>

      {/* Sage leaves along main stem */}
      <path d="M70 150 Q52 140 46 126 Q56 136 70 150" fill={GREEN} fillOpacity="0.32" stroke="currentColor" strokeWidth="1"/>
      <path d="M70 150 Q88 140 94 126 Q84 136 70 150" fill={GREEN} fillOpacity="0.32" stroke="currentColor" strokeWidth="1"/>
      <path d="M70 130 Q54 120 50 106 Q58 116 70 130" fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="1"/>
      <path d="M70 130 Q86 120 90 106 Q82 116 70 130" fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="1"/>

      {/* ── Large central flower head ── */}
      {/* Calyx / sepal base */}
      <path d="M70 52 Q60 56 56 64 Q64 58 70 52 Z" fill={GREEN} fillOpacity="0.55" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M70 52 Q80 56 84 64 Q76 58 70 52 Z" fill={GREEN} fillOpacity="0.55" stroke="currentColor" strokeWidth="0.9"/>
      {/* Outer large petals — 5 petals */}
      {[0,72,144,216,288].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const px = 70 + 42 * Math.cos(r);
        const py = 38 + 42 * Math.sin(r);
        const cp1x = 70 + 28 * Math.cos(r - 0.5);
        const cp1y = 38 + 28 * Math.sin(r - 0.5);
        const cp2x = 70 + 28 * Math.cos(r + 0.5);
        const cp2y = 38 + 28 * Math.sin(r + 0.5);
        return (
          <path key={i}
            d={`M70 38 C${cp1x} ${cp1y} ${px - 6} ${py - 6} ${px} ${py} C${px + 6} ${py + 6} ${cp2x} ${cp2y} 70 38`}
            fill={PURPLE} fillOpacity="0.28" stroke={PURPLE} strokeWidth="1.3" opacity="0.80"/>
        );
      })}
      {/* Inner petals — 5 smaller, rotated 36deg */}
      {[36,108,180,252,324].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const px = 70 + 28 * Math.cos(r);
        const py = 38 + 28 * Math.sin(r);
        const cp1x = 70 + 18 * Math.cos(r - 0.4);
        const cp1y = 38 + 18 * Math.sin(r - 0.4);
        const cp2x = 70 + 18 * Math.cos(r + 0.4);
        const cp2y = 38 + 18 * Math.sin(r + 0.4);
        return (
          <path key={i}
            d={`M70 38 C${cp1x} ${cp1y} ${px - 4} ${py - 4} ${px} ${py} C${px + 4} ${py + 4} ${cp2x} ${cp2y} 70 38`}
            fill={PURPLE} fillOpacity="0.40" stroke={PURPLE} strokeWidth="1.1" opacity="0.85"/>
        );
      })}
      {/* Flower center */}
      <circle cx="70" cy="38" r="14" fill={PURPLE} fillOpacity="0.22" stroke={PURPLE} strokeWidth="1.5"/>
      <circle cx="70" cy="38" r="9"  fill={PURPLE} fillOpacity="0.38"/>
      <circle cx="70" cy="38" r="5"  fill="currentColor" opacity="0.65"/>
      {/* Stamens / pollen dots */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return <circle key={i} cx={70 + 11 * Math.cos(r)} cy={38 + 11 * Math.sin(r)} r="1.8" fill="currentColor" opacity="0.55"/>;
      })}

      {/* ── Branch flower heads (smaller) ── */}
      {/* Left branch at ~(38,62) */}
      {[0,72,144,216,288].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const px = 38 + 22 * Math.cos(r);
        const py = 56 + 22 * Math.sin(r);
        return (
          <path key={i}
            d={`M38 56 Q${38 + 14 * Math.cos(r - 0.4)} ${56 + 14 * Math.sin(r - 0.4)} ${px} ${py} Q${38 + 14 * Math.cos(r + 0.4)} ${56 + 14 * Math.sin(r + 0.4)} 38 56`}
            fill={PURPLE} fillOpacity="0.25" stroke={PURPLE} strokeWidth="1" opacity="0.72"/>
        );
      })}
      <circle cx="38" cy="56" r="8" fill={PURPLE} fillOpacity="0.30"/>
      <circle cx="38" cy="56" r="4" fill="currentColor" opacity="0.55"/>

      {/* Right branch at ~(102,62) */}
      {[0,72,144,216,288].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const px = 102 + 22 * Math.cos(r);
        const py = 56 + 22 * Math.sin(r);
        return (
          <path key={i}
            d={`M102 56 Q${102 + 14 * Math.cos(r - 0.4)} ${56 + 14 * Math.sin(r - 0.4)} ${px} ${py} Q${102 + 14 * Math.cos(r + 0.4)} ${56 + 14 * Math.sin(r + 0.4)} 102 56`}
            fill={PURPLE} fillOpacity="0.25" stroke={PURPLE} strokeWidth="1" opacity="0.72"/>
        );
      })}
      <circle cx="102" cy="56" r="8" fill={PURPLE} fillOpacity="0.30"/>
      <circle cx="102" cy="56" r="4" fill="currentColor" opacity="0.55"/>

      {/* Petal sparkles */}
      <text x="28"  y="36" fontSize="8"  fill={PURPLE} opacity="0.70" fontFamily="serif">✦</text>
      <text x="108" y="34" fontSize="6"  fill={PURPLE} opacity="0.62" fontFamily="serif">✧</text>
      <text x="70"  y="8"  textAnchor="middle" fontSize="7" fill={PURPLE} opacity="0.65" fontFamily="serif">◈</text>
      <circle cx="24"  cy="52" r="2"   fill={PURPLE} opacity="0.48"/>
      <circle cx="116" cy="50" r="1.8" fill={PURPLE} opacity="0.44"/>
    </svg>
  );
}

/** Crescent moon */
function CrescentMoon({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 55 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 5 Q8 7 5 32 Q2 57 36 62 Q22 54 20 34 Q18 12 38 5 Z" fill="currentColor" opacity="0.72"/>
      <path d="M36 10 Q16 14 16 34 Q16 52 34 58" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.32" strokeLinecap="round"/>
      <text x="47" y="17" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.80" fontFamily="serif">✦</text>
      <text x="50" y="38" textAnchor="middle" fontSize="7"  fill="currentColor" opacity="0.60" fontFamily="serif">✧</text>
    </svg>
  );
}

/** Decorative leaf vine corner */
function LeafVine({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main vine */}
      <path d="M4 56 Q20 40 40 32 Q70 20 110 8"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.65"/>
      {/* Leaves along vine */}
      <path d="M20 46 Q12 38 10 28 Q16 36 20 46" fill={GREEN} fillOpacity="0.35" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M20 46 Q28 42 30 32 Q24 40 20 46" fill={GREEN} fillOpacity="0.30" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M44 32 Q36 24 36 14 Q40 22 44 32" fill={GREEN} fillOpacity="0.32" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M44 32 Q52 28 54 18 Q48 26 44 32" fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="0.9"/>
      <path d="M72 20 Q66 12 66 4 Q70 12 72 20"  fill={GREEN} fillOpacity="0.28" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M72 20 Q80 18 82 10 Q76 16 72 20"  fill={GREEN} fillOpacity="0.24" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M100 10 Q96 4 96 -2 Q100 4 100 10" fill={GREEN} fillOpacity="0.24" stroke="currentColor" strokeWidth="0.8"/>
      {/* Small berries/dots */}
      <circle cx="32"  cy="38" r="2.2" fill="currentColor" opacity="0.45"/>
      <circle cx="58"  cy="24" r="2"   fill="currentColor" opacity="0.42"/>
      <circle cx="86"  cy="14" r="1.8" fill="currentColor" opacity="0.38"/>
      <circle cx="108" cy="8"  r="1.5" fill="currentColor" opacity="0.35"/>
    </svg>
  );
}

type ElProps = { style: React.CSSProperties; children: React.ReactNode };
function El({ style, children }: ElProps) {
  return (
    <div style={{ position: "absolute", pointerEvents: "none", ...style }}>
      {children}
    </div>
  );
}

export function SageBg() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>

      {/* ── Nagy zsálya csokor — bal oldal ── */}
      <El style={{ top: -10, left: 18, transform: "rotate(-10deg)", opacity: 0.19, color: SEPIA }}>
        <SageBundle width={115} height={253} />
      </El>

      {/* ── Száradó herb csokrok — alul középen ── */}
      <El style={{ bottom: 14, left: "20%", transform: "rotate(-3deg)", opacity: 0.17, color: SEPIA }}>
        <HangingHerbs width={190} height={118} />
      </El>

      {/* ── Nyitott könyv — jobb felső ── */}
      <El style={{ top: 16, right: 16, transform: "rotate(6deg)", opacity: 0.17, color: SEPIA }}>
        <OpenBook width={145} height={100} />
      </El>

      {/* ── Kis üvegek — jobb él ── */}
      <El style={{ top: "32%", right: 10, transform: "rotate(8deg)", opacity: 0.18, color: SEPIA }}>
        <HerbJar width={60} height={93} />
      </El>
      <El style={{ top: "52%", right: 14, transform: "rotate(-6deg)", opacity: 0.16, color: SEPIA }}>
        <HerbJar width={48} height={74} />
      </El>

      {/* ── Mozsár-törő — bal alsó ── */}
      <El style={{ bottom: 20, left: 55, transform: "rotate(-8deg)", opacity: 0.17, color: SEPIA }}>
        <MortarPestle width={105} height={88} />
      </El>

      {/* ── Nagy virágfej — jobb alsó negyedben ── */}
      <El style={{ bottom: 40, right: 30, transform: "rotate(12deg)", opacity: 0.18, color: SEPIA }}>
        <SageFlower width={155} height={198} />
      </El>

      {/* ── Sarló holdak — sarkok ── */}
      <El style={{ top: 6, right: 168, transform: "rotate(10deg)", opacity: 0.22, color: SEPIA }}>
        <CrescentMoon width={52} height={62} />
      </El>
      <El style={{ bottom: 140, right: 8, transform: "rotate(-8deg) scaleX(-1)", opacity: 0.18, color: SEPIA }}>
        <CrescentMoon width={42} height={50} />
      </El>

      {/* ── Leveles keret — bal alsó sarok ── */}
      <El style={{ bottom: 8, left: 8, transform: "rotate(0deg)", opacity: 0.18, color: SEPIA }}>
        <LeafVine width={130} height={65} />
      </El>
      {/* Leveles keret — jobb felső sarok (tükrözve) */}
      <El style={{ top: 120, right: 8, transform: "rotate(180deg)", opacity: 0.15, color: SEPIA }}>
        <LeafVine width={110} height={55} />
      </El>

      {/* ── Szétszórt csillagok ── */}
      <El style={{ top: "10%", right: "30%", opacity: 0.18, color: SEPIA }}>
        <svg width="65" height="55" viewBox="0 0 65 55" fill="none">
          <text x="4"  y="18" fontSize="12" fill="currentColor" opacity="0.78" fontFamily="serif">✦</text>
          <text x="36" y="40" fontSize="8"  fill="currentColor" opacity="0.58" fontFamily="serif">✧</text>
          <text x="50" y="16" fontSize="10" fill="currentColor" opacity="0.66" fontFamily="serif">◈</text>
        </svg>
      </El>
      <El style={{ top: "45%", left: "35%", opacity: 0.12, color: SEPIA }}>
        <svg width="50" height="45" viewBox="0 0 50 45" fill="none">
          <text x="4"  y="16" fontSize="9"  fill="currentColor" opacity="0.65" fontFamily="serif">✧</text>
          <text x="26" y="34" fontSize="11" fill="currentColor" opacity="0.70" fontFamily="serif">✦</text>
        </svg>
      </El>

    </div>
  );
}
