// Alchemist laboratory background — for finances pages
// Based on: round flasks, candle flame, scroll, ink notes

const SEPIA = "var(--color-teal)";
const FLAME = "#c87820";

/** Large round-bottom alchemical flask */
function RoundFlask({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles above */}
      <text x="55" y="10" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.70" fontFamily="serif">✦</text>
      <circle cx="30" cy="16" r="1.8" fill="currentColor" opacity="0.48"/>
      <circle cx="80" cy="14" r="1.3" fill="currentColor" opacity="0.40"/>

      {/* Cork stopper */}
      <path d="M38 20 Q55 16 72 20 L70 34 Q55 30 40 34 Z"
        fill="currentColor" fillOpacity="0.78" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="38" y1="24" x2="72" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.28"/>
      <line x1="38" y1="28" x2="72" y2="28" stroke="currentColor" strokeWidth="0.6" opacity="0.28"/>

      {/* Neck */}
      <rect x="40" y="34" width="30" height="26" rx="1"
        fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="43" y="36" width="8" height="22" rx="4" fill="currentColor" fillOpacity="0.18"/>

      {/* String around neck */}
      <path d="M40 44 Q55 40 70 44" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* String tail + label */}
      <path d="M70 44 Q80 52 78 64" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M78 64 Q86 68 84 78 Q82 84 76 82 Q70 80 72 72 Q74 66 78 64 Z"
        fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="0.9"/>
      <circle cx="78" cy="66" r="1.8" fill="currentColor" opacity="0.68"/>
      <text x="78" y="77" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.60" fontFamily="serif">✦</text>

      {/* Round flask body */}
      <ellipse cx="55" cy="118" rx="48" ry="38"
        fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="2"/>
      {/* Shoulder curves */}
      <path d="M40 60 Q8 74 7 104"  stroke="currentColor" strokeWidth="1.6"/>
      <path d="M70 60 Q102 74 103 104" stroke="currentColor" strokeWidth="1.6"/>

      {/* Diamond/cross pattern on glass (from fiola image) */}
      <path d="M18 104 L55 88 L92 104 L55 120 Z"
        stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.28"/>
      <path d="M18 112 L55 96 L92 112 L55 128 Z"
        stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.20"/>

      {/* Liquid fill */}
      <path d="M10 124 Q55 116 100 124 L100 156 Q55 163 10 156 Z"
        fill="currentColor" fillOpacity="0.28"/>
      {/* Liquid surface ripple */}
      <path d="M11 125 Q30 119 55 121 Q80 119 99 125"
        stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.50" strokeLinecap="round"/>
      <path d="M15 130 Q35 125 55 127 Q75 125 95 130"
        stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.28" strokeLinecap="round"/>

      {/* Floating crystals / particles in liquid */}
      <ellipse cx="30" cy="138" rx="4"   ry="6"   fill="currentColor" opacity="0.32" transform="rotate(-20 30 138)"/>
      <ellipse cx="55" cy="130" rx="3"   ry="5"   fill="currentColor" opacity="0.28" transform="rotate(10 55 130)"/>
      <ellipse cx="76" cy="142" rx="3.5" ry="5.5" fill="currentColor" opacity="0.30" transform="rotate(25 76 142)"/>

      {/* Bubbles */}
      <circle cx="24"  cy="128" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.42"/>
      <circle cx="24"  cy="128" r="2.5" fill="currentColor" opacity="0.20"/>
      <circle cx="78"  cy="120" r="4.5" fill="none" stroke="currentColor" strokeWidth="1"   opacity="0.36"/>
      <circle cx="46"  cy="116" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <circle cx="88"  cy="134" r="3"   fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.32"/>
      <circle cx="18"  cy="140" r="2.2" fill="currentColor" opacity="0.26"/>
      <circle cx="66"  cy="148" r="1.6" fill="currentColor" opacity="0.22"/>

      {/* Glass shine */}
      <path d="M12 90 Q15 76 20 70" stroke="currentColor" strokeWidth="2.2" opacity="0.50" strokeLinecap="round"/>
      <path d="M14 106 Q16 98 20 95" stroke="currentColor" strokeWidth="1.2" opacity="0.36" strokeLinecap="round"/>

      {/* Measure marks */}
      <line x1="6"  y1="120" x2="11" y2="120" stroke="currentColor" strokeWidth="1"   opacity="0.30"/>
      <line x1="5"  y1="132" x2="11" y2="132" stroke="currentColor" strokeWidth="1"   opacity="0.30"/>
      <line x1="6"  y1="144" x2="10" y2="144" stroke="currentColor" strokeWidth="0.8" opacity="0.24"/>
    </svg>
  );
}

/** Slim tall bottle (Erlenmeyer style) */
function SlimBottle({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 55 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cork */}
      <rect x="18" y="4" width="19" height="12" rx="3.5" fill="currentColor" opacity="0.80"/>
      <line x1="18" y1="8"  x2="37" y2="8"  stroke="currentColor" strokeWidth="0.5" opacity="0.26"/>
      <line x1="18" y1="12" x2="37" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.26"/>
      {/* Neck */}
      <rect x="20" y="16" width="15" height="22" fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="22" y="18" width="5"  height="18" rx="2.5" fill="currentColor" fillOpacity="0.18"/>
      {/* String */}
      <path d="M20 24 Q27.5 21 35 24" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Conical body */}
      <path d="M20 38 Q4 52 4 72 Q4 96 27.5 102 Q51 96 51 72 Q51 52 35 38 Z"
        fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.6"/>
      {/* Liquid */}
      <path d="M7 78 Q27.5 72 48 78 L48 102 Q27.5 108 7 102 Z" fill="currentColor" fillOpacity="0.26"/>
      <path d="M8 79 Q18 74 27.5 76 Q37 74 47 79"
        stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.46" strokeLinecap="round"/>
      {/* Bubbles */}
      <circle cx="18" cy="84" r="4"   fill="none" stroke="currentColor" strokeWidth="1"   opacity="0.40"/>
      <circle cx="36" cy="76" r="3"   fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.34"/>
      <circle cx="42" cy="90" r="2"   fill="currentColor" opacity="0.26"/>
      <circle cx="12" cy="94" r="1.5" fill="currentColor" opacity="0.22"/>
      {/* Shine */}
      <path d="M8 52 Q10 42 13 38" stroke="currentColor" strokeWidth="1.6" opacity="0.48" strokeLinecap="round"/>
    </svg>
  );
}

/** Candle with flame */
function CandleFlame({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 60 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flame glow */}
      <ellipse cx="30" cy="22" rx="14" ry="18" fill={FLAME} fillOpacity="0.12"/>
      {/* Outer flame */}
      <path d="M30 4 Q22 12 20 22 Q18 34 30 38 Q42 34 40 22 Q38 12 30 4 Z"
        fill={FLAME} fillOpacity="0.55" stroke={FLAME} strokeWidth="0.8"/>
      {/* Inner flame core */}
      <path d="M30 12 Q26 18 25 24 Q24 32 30 34 Q36 32 35 24 Q34 18 30 12 Z"
        fill={FLAME} fillOpacity="0.80"/>
      {/* Wick */}
      <line x1="30" y1="36" x2="30" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Candle body */}
      <rect x="20" y="44" width="20" height="60" rx="3"
        fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.6"/>
      {/* Wax drips */}
      <path d="M20 52 Q16 58 17 65 Q18 68 20 66 Q22 64 20 58 Z"
        fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M40 60 Q44 66 43 72 Q42 75 40 73 Q38 71 40 65 Z"
        fill="currentColor" fillOpacity="0.20" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M28 44 Q26 50 26 55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.30"/>
      {/* Candle holder / base dish */}
      <ellipse cx="30" cy="106" rx="22" ry="6"
        fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M14 106 Q14 114 30 118 Q46 114 46 106"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx="30" cy="118" rx="16" ry="4"
        fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.2"/>
      {/* Candle texture lines */}
      <line x1="24" y1="50" x2="24" y2="102" stroke="currentColor" strokeWidth="0.7" opacity="0.20"/>
      <line x1="36" y1="50" x2="36" y2="102" stroke="currentColor" strokeWidth="0.7" opacity="0.20"/>
      {/* Glow sparkles */}
      <text x="50" y="20" fontSize="8"  fill={FLAME} opacity="0.75" fontFamily="serif">✦</text>
      <text x="6"  y="28" fontSize="6"  fill={FLAME} opacity="0.60" fontFamily="serif">✧</text>
      <circle cx="46" cy="35" r="1.5" fill={FLAME} opacity="0.55"/>
      <circle cx="14" cy="40" r="1.2" fill={FLAME} opacity="0.48"/>
    </svg>
  );
}

/** Rolled parchment scroll */
function Scroll({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main scroll body */}
      <rect x="14" y="14" width="82" height="42" rx="4"
        fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.6"/>
      {/* Left rolled end */}
      <ellipse cx="14" cy="35" rx="8" ry="21"
        fill="currentColor" fillOpacity="0.20" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx="14" cy="35" rx="4" ry="16" fill="currentColor" fillOpacity="0.14"/>
      {/* Right rolled end */}
      <ellipse cx="96" cy="35" rx="8" ry="21"
        fill="currentColor" fillOpacity="0.20" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx="96" cy="35" rx="4" ry="16" fill="currentColor" fillOpacity="0.14"/>
      {/* Text lines on scroll */}
      <line x1="24" y1="24" x2="86" y2="24" stroke="currentColor" strokeWidth="0.9" opacity="0.32"/>
      <line x1="24" y1="30" x2="86" y2="30" stroke="currentColor" strokeWidth="0.9" opacity="0.32"/>
      <line x1="24" y1="36" x2="86" y2="36" stroke="currentColor" strokeWidth="0.9" opacity="0.32"/>
      <line x1="24" y1="42" x2="72" y2="42" stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
      <line x1="24" y1="48" x2="60" y2="48" stroke="currentColor" strokeWidth="0.9" opacity="0.24"/>
      {/* Small seal */}
      <circle cx="55" cy="36" r="7" fill="currentColor" fillOpacity="0.20" stroke="currentColor" strokeWidth="0.8" opacity="0.40"/>
      <text x="55" y="40" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.55" fontFamily="serif">✦</text>
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

export function VialBg() {
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
      {/* ── Nagy kerek palack — bal alsó ── */}
      <El style={{ bottom: -20, left: 20, transform: "rotate(-8deg)", opacity: 0.20, color: SEPIA }}>
        <RoundFlask width={150} height={218} />
      </El>

      {/* ── Karcsú fiola — jobb felső ── */}
      <El style={{ top: -10, right: 30, transform: "rotate(14deg)", opacity: 0.18, color: SEPIA }}>
        <SlimBottle width={80} height={160} />
      </El>

      {/* ── Gyertya — bal felső sarok ── */}
      <El style={{ top: 20, left: 50, transform: "rotate(-10deg)", opacity: 0.20, color: SEPIA }}>
        <CandleFlame width={72} height={156} />
      </El>

      {/* ── Kis fiola — jobb él közepe ── */}
      <El style={{ top: "40%", right: 10, transform: "rotate(-6deg)", opacity: 0.16, color: SEPIA }}>
        <SlimBottle width={55} height={110} />
      </El>

      {/* ── Nagy palack — jobb alsó ── */}
      <El style={{ bottom: 10, right: 30, transform: "rotate(10deg)", opacity: 0.16, color: SEPIA }}>
        <RoundFlask width={105} height={152} />
      </El>

      {/* ── Tekercs — alul középen ── */}
      <El style={{ bottom: 22, left: "32%", transform: "rotate(-5deg)", opacity: 0.17, color: SEPIA }}>
        <Scroll width={120} height={76} />
      </El>

      {/* ── Gyertya — jobb alul ── */}
      <El style={{ bottom: 90, right: "22%", transform: "rotate(8deg)", opacity: 0.14, color: SEPIA }}>
        <CandleFlame width={52} height={112} />
      </El>

      {/* ── Csillag akcentusok ── */}
      <El style={{ top: "12%", right: "28%", opacity: 0.18, color: SEPIA }}>
        <svg width="65" height="55" viewBox="0 0 65 55" fill="none">
          <text x="6"  y="18" fontSize="13" fill="currentColor" opacity="0.78" fontFamily="serif">✦</text>
          <text x="38" y="40" fontSize="8"  fill="currentColor" opacity="0.58" fontFamily="serif">✧</text>
          <text x="50" y="16" fontSize="10" fill="currentColor" opacity="0.66" fontFamily="serif">◈</text>
        </svg>
      </El>
      <El style={{ top: "55%", left: "36%", opacity: 0.12, color: SEPIA }}>
        <svg width="50" height="45" viewBox="0 0 50 45" fill="none">
          <text x="4"  y="16" fontSize="9"  fill="currentColor" opacity="0.65" fontFamily="serif">✧</text>
          <text x="26" y="34" fontSize="11" fill="currentColor" opacity="0.70" fontFamily="serif">✦</text>
        </svg>
      </El>
      {/* Flame glow accents */}
      <El style={{ top: 18, left: 54, opacity: 0.22, color: FLAME }}>
        <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
          <text x="0"  y="16" fontSize="11" fill="currentColor" opacity="0.80" fontFamily="serif">✦</text>
          <text x="24" y="10" fontSize="7"  fill="currentColor" opacity="0.60" fontFamily="serif">✧</text>
        </svg>
      </El>
    </div>
  );
}
