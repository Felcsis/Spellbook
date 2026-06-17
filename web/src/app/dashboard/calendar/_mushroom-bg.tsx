// Grimoire mushroom background — Amanita muscaria botanical illustration style
// Specific to the calendar page

const CAP   = "#9a4218"; // warm rust for mushroom cap
const SEPIA = "var(--color-teal)";

function AmanitaLarge({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 130 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap dome */}
      <path d="M12 95 Q8 42 65 14 Q122 42 118 95 Z"
        fill={CAP} fillOpacity="0.25" stroke="currentColor" strokeWidth="2"/>
      {/* Cap underside rim */}
      <path d="M12 95 Q65 108 118 95"
        stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Gills radiating from stem */}
      {[14,24,34,44,54,64,74,84,94,104,114].map((x, i) => (
        <line key={i} x1={x} y1="94" x2="65" y2="103"
          stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
      ))}
      {/* White wart dots on cap */}
      <circle cx="42" cy="48"  r="8"   fill="currentColor" opacity="0.70"/>
      <circle cx="65" cy="28"  r="10"  fill="currentColor" opacity="0.75"/>
      <circle cx="88" cy="48"  r="8"   fill="currentColor" opacity="0.70"/>
      <circle cx="28" cy="72"  r="6.5" fill="currentColor" opacity="0.62"/>
      <circle cx="58" cy="65"  r="5.5" fill="currentColor" opacity="0.58"/>
      <circle cx="78" cy="62"  r="5"   fill="currentColor" opacity="0.58"/>
      <circle cx="100" cy="70" r="6"   fill="currentColor" opacity="0.62"/>
      <circle cx="50" cy="84"  r="4"   fill="currentColor" opacity="0.50"/>
      <circle cx="82" cy="82"  r="4.5" fill="currentColor" opacity="0.52"/>
      <circle cx="65" cy="50"  r="3.5" fill="currentColor" opacity="0.48"/>
      {/* Inner dot rings */}
      <circle cx="42" cy="48"  r="4.5" fill={CAP} fillOpacity="0.18"/>
      <circle cx="65" cy="28"  r="5.5" fill={CAP} fillOpacity="0.18"/>
      <circle cx="88" cy="48"  r="4.5" fill={CAP} fillOpacity="0.18"/>
      {/* Stem */}
      <path d="M52 103 Q50 168 50 188 L80 188 Q80 168 78 103 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8"/>
      {/* Stem lengthwise texture */}
      <line x1="58" y1="106" x2="57" y2="185" stroke="currentColor" strokeWidth="0.7" opacity="0.25"/>
      <line x1="65" y1="104" x2="65" y2="185" stroke="currentColor" strokeWidth="0.7" opacity="0.20"/>
      {/* Annulus (skirt) */}
      <path d="M42 135 Q65 145 88 135"
        stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M44 140 Q65 150 86 140"
        stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.40" strokeLinecap="round"/>
      {/* Volva at base */}
      <path d="M46 185 Q40 192 42 198 Q65 202 88 198 Q90 192 84 185"
        fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4"/>
      {/* Ground line + moss */}
      <path d="M22 188 Q65 182 108 188"
        stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M30 191 Q65 186 100 191"
        stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.35" strokeLinecap="round"/>
      {/* Mycelium roots */}
      <path d="M58 188 Q52 194 48 200" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.50"/>
      <path d="M65 190 Q63 197 62 200" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.48"/>
      <path d="M72 188 Q78 194 82 200" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.50"/>
      <path d="M52 192 Q44 196 40 200" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.38"/>
      <path d="M78 192 Q86 196 90 200" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.38"/>
    </svg>
  );
}

function AmanitaSmall({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap */}
      <path d="M6 56 Q4 24 40 8 Q76 24 74 56 Z"
        fill={CAP} fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M6 56 Q40 65 74 56"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* Gills */}
      {[8,18,28,38,48,58,68].map((x, i) => (
        <line key={i} x1={x} y1="55" x2="40" y2="62"
          stroke="currentColor" strokeWidth="0.8" opacity="0.26"/>
      ))}
      {/* Dots */}
      <circle cx="25" cy="28" r="5.5" fill="currentColor" opacity="0.68"/>
      <circle cx="40" cy="16" r="7"   fill="currentColor" opacity="0.72"/>
      <circle cx="55" cy="28" r="5.5" fill="currentColor" opacity="0.68"/>
      <circle cx="18" cy="44" r="4"   fill="currentColor" opacity="0.58"/>
      <circle cx="60" cy="42" r="4"   fill="currentColor" opacity="0.58"/>
      <circle cx="38" cy="40" r="3.5" fill="currentColor" opacity="0.52"/>
      {/* Stem */}
      <path d="M32 62 Q31 102 31 112 L49 112 Q49 102 48 62 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="37" y1="64" x2="36" y2="110" stroke="currentColor" strokeWidth="0.7" opacity="0.22"/>
      {/* Annulus */}
      <path d="M24 82 Q40 89 56 82"
        stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* Volva */}
      <path d="M28 110 Q24 116 26 120 Q40 123 54 120 Q56 116 52 110"
        fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.2"/>
      {/* Ground */}
      <path d="M14 112 Q40 107 66 112"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* Roots */}
      <path d="M36 112 Q32 118 30 122" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
      <path d="M44 112 Q48 118 50 122" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
    </svg>
  );
}

function TinyMushroom({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 28 Q2 10 20 4 Q38 10 37 28 Z"
        fill={CAP} fillOpacity="0.20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 28 Q20 34 37 28"
        stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="3.5" fill="currentColor" opacity="0.62"/>
      <circle cx="20" cy="8"  r="4.5" fill="currentColor" opacity="0.66"/>
      <circle cx="28" cy="16" r="3.5" fill="currentColor" opacity="0.62"/>
      <circle cx="10" cy="24" r="2.5" fill="currentColor" opacity="0.52"/>
      <circle cx="30" cy="23" r="2.5" fill="currentColor" opacity="0.52"/>
      <rect x="17" y="28" width="6" height="22" rx="2.5"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M12 38 Q20 42 28 38"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M10 50 Q20 47 30 50"
        stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function SporeCircle({ width, height }: { width: number; height: number }) {
  const cx = 40; const cy = 40;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return {
      x1: cx + 10 * Math.cos(a), y1: cy + 10 * Math.sin(a),
      x2: cx + 34 * Math.cos(a), y2: cy + 34 * Math.sin(a),
    };
  });
  return (
    <svg width={width} height={height} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="37" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/>
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="0.7" opacity="0.30"/>
      {rays.map((r, i) => (
        <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke="currentColor" strokeWidth="0.8" opacity="0.32"/>
      ))}
      <circle cx="40" cy="40" r="10" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1"/>
      <circle cx="40" cy="40" r="4"  fill="currentColor" opacity="0.38"/>
      {/* Spore dots on outer ring */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return <circle key={i} cx={cx + 36 * Math.cos(a)} cy={cy + 36 * Math.sin(a)} r="2" fill="currentColor" opacity="0.42"/>;
      })}
    </svg>
  );
}

function MyceliumBranch({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main branches */}
      <path d="M55 88 Q52 65 48 44 Q44 22 40 6"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.68"/>
      <path d="M48 44 Q32 36 18 20"              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.60"/>
      <path d="M48 44 Q62 34 76 16"              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.60"/>
      {/* Sub-branches */}
      <path d="M40 24 Q28 16 20 8"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.50"/>
      <path d="M40 24 Q46 14 50 4"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.50"/>
      <path d="M18 20 Q10 14 6 6"   stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.44"/>
      <path d="M76 16 Q84 10 90 4"  stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.44"/>
      <path d="M62 60 Q72 55 82 46" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.52"/>
      <path d="M82 46 Q90 40 98 32" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.44"/>
      {/* Spore nodes at tips */}
      <circle cx="40"  cy="6"  r="2.8" fill="currentColor" opacity="0.55"/>
      <circle cx="50"  cy="4"  r="2.2" fill="currentColor" opacity="0.50"/>
      <circle cx="20"  cy="8"  r="2"   fill="currentColor" opacity="0.48"/>
      <circle cx="6"   cy="6"  r="1.8" fill="currentColor" opacity="0.44"/>
      <circle cx="90"  cy="4"  r="1.8" fill="currentColor" opacity="0.44"/>
      <circle cx="98"  cy="32" r="1.6" fill="currentColor" opacity="0.40"/>
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

export function MushroomBg() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Nagy Amanita — bal alsó sarok ── */}
      <El style={{ bottom: -30, left: 30, transform: "rotate(-6deg)", opacity: 0.20, color: SEPIA }}>
        <AmanitaLarge width={160} height={246} />
      </El>

      {/* ── Közepes Amanita — jobb felső sarok ── */}
      <El style={{ top: -18, right: 25, transform: "rotate(12deg)", opacity: 0.18, color: SEPIA }}>
        <AmanitaSmall width={110} height={165} />
      </El>

      {/* ── Kis Amanita — bal felső ── */}
      <El style={{ top: 30, left: 55, transform: "rotate(-14deg)", opacity: 0.14, color: SEPIA }}>
        <AmanitaSmall width={72} height={108} />
      </El>

      {/* ── Kis Amanita — jobb él közepe ── */}
      <El style={{ top: "44%", right: 8, transform: "rotate(8deg)", opacity: 0.15, color: SEPIA }}>
        <AmanitaSmall width={68} height={102} />
      </El>

      {/* ── Apró gombák — alul szétszórva ── */}
      <El style={{ bottom: 18, left: "30%", transform: "rotate(-5deg)", opacity: 0.16, color: SEPIA }}>
        <TinyMushroom width={52} height={72} />
      </El>
      <El style={{ bottom: 12, left: "42%", transform: "rotate(4deg)", opacity: 0.14, color: SEPIA }}>
        <TinyMushroom width={40} height={55} />
      </El>
      <El style={{ bottom: 22, right: "28%", transform: "rotate(-8deg)", opacity: 0.13, color: SEPIA }}>
        <TinyMushroom width={44} height={60} />
      </El>

      {/* ── Spóra körök — margókban ── */}
      <El style={{ top: "18%", right: 12, transform: "rotate(15deg)", opacity: 0.16, color: SEPIA }}>
        <SporeCircle width={72} height={72} />
      </El>
      <El style={{ top: "62%", left: 22, transform: "rotate(-10deg)", opacity: 0.13, color: SEPIA }}>
        <SporeCircle width={55} height={55} />
      </El>
      <El style={{ bottom: "30%", right: "18%", transform: "rotate(5deg)", opacity: 0.10, color: SEPIA }}>
        <SporeCircle width={48} height={48} />
      </El>

      {/* ── Micélium elágazás — jobb alsó sarok ── */}
      <El style={{ bottom: 80, right: 14, transform: "rotate(-5deg)", opacity: 0.14, color: SEPIA }}>
        <MyceliumBranch width={100} height={82} />
      </El>

      {/* ── Csillag akcentusok ── */}
      <El style={{ top: "8%", left: "45%", opacity: 0.16, color: SEPIA }}>
        <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
          <text x="6"  y="18" fontSize="12" fill="currentColor" opacity="0.75" fontFamily="serif">✦</text>
          <text x="36" y="36" fontSize="8"  fill="currentColor" opacity="0.58" fontFamily="serif">✧</text>
          <text x="46" y="14" fontSize="9"  fill="currentColor" opacity="0.65" fontFamily="serif">◈</text>
        </svg>
      </El>
      <El style={{ top: "38%", left: "38%", opacity: 0.10, color: SEPIA }}>
        <svg width="50" height="40" viewBox="0 0 50 40" fill="none">
          <text x="4"  y="16" fontSize="9"  fill="currentColor" opacity="0.68" fontFamily="serif">✧</text>
          <text x="28" y="30" fontSize="11" fill="currentColor" opacity="0.72" fontFamily="serif">✦</text>
        </svg>
      </El>
    </div>
  );
}
