// Grimoire background — botanical illustration style, aged parchment aesthetic
// Monochromatic sepia ink, lavender buds in purple accent

const SEPIA = "var(--color-teal)"; // warm brown ink, adapts to theme

function LavenderBundle({ width, height }: { width: number; height: number }) {
  const bud = "#9878c8";
  return (
    <svg width={width} height={height} viewBox="0 0 90 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handle */}
      <path d="M44 200 Q42 186 44 170" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      {/* Bow left loop */}
      <path d="M38 162 Q24 150 28 138 Q34 132 42 140 Q44 150 42 162"
        fill={bud} fillOpacity="0.20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Bow right loop */}
      <path d="M50 162 Q66 150 62 138 Q56 132 48 140 Q46 150 48 162"
        fill={bud} fillOpacity="0.20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Knot */}
      <ellipse cx="44" cy="162" rx="6" ry="4.5" fill="currentColor" opacity="0.65"/>
      <path d="M34 166 Q44 163 54 166" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M36 170 Q44 167 52 170" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Ribbon tails */}
      <path d="M40 166 Q36 178 38 188" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M48 166 Q52 178 50 188" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Five stems */}
      <path d="M39 162 Q28 130 20 70"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M41 162 Q34 128 31 65"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M44 162 Q44 126 45 58"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M47 162 Q54 128 57 65"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M49 162 Q62 130 70 70"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Leaf pairs */}
      <path d="M45 120 Q31 110 27 96 Q36 106 45 120"  fill="currentColor" opacity="0.40"/>
      <path d="M45 120 Q59 110 63 96 Q54 106 45 120"  fill="currentColor" opacity="0.40"/>
      <path d="M45 140 Q35 130 32 118 Q39 127 45 140" fill="currentColor" opacity="0.36"/>
      <path d="M45 140 Q55 130 58 118 Q51 127 45 140" fill="currentColor" opacity="0.36"/>
      <path d="M34 115 Q22 105 19 91" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.60"/>
      <path d="M28 135 Q18 126 15 113" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      <path d="M55 115 Q67 105 71 91" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.60"/>
      <path d="M60 135 Q70 126 73 113" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      {/* Flower spikes */}
      {/* Far left */}
      <path d="M20 70 Q17 50 17 28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="17" cy="30" rx="2.8" ry="5.2" fill={bud} opacity="0.88" transform="rotate(-18 17 30)"/>
      <ellipse cx="17" cy="39" rx="2.5" ry="4.6" fill={bud} opacity="0.76" transform="rotate(-18 17 39)"/>
      <ellipse cx="17" cy="48" rx="2.2" ry="4"   fill={bud} opacity="0.64" transform="rotate(-18 17 48)"/>
      <ellipse cx="17" cy="56" rx="2"   ry="3.5"  fill={bud} opacity="0.52" transform="rotate(-18 17 56)"/>
      <ellipse cx="18" cy="63" rx="1.7" ry="3"    fill={bud} opacity="0.40" transform="rotate(-18 18 63)"/>
      {/* Left-center */}
      <path d="M31 65 Q30 44 30 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="30" cy="20" rx="3"   ry="5.5"  fill={bud} opacity="0.90" transform="rotate(-8 30 20)"/>
      <ellipse cx="30" cy="29" rx="2.7" ry="5"    fill={bud} opacity="0.78" transform="rotate(-8 30 29)"/>
      <ellipse cx="30" cy="38" rx="2.4" ry="4.5"  fill={bud} opacity="0.66" transform="rotate(-8 30 38)"/>
      <ellipse cx="30" cy="47" rx="2.1" ry="4"    fill={bud} opacity="0.54" transform="rotate(-8 30 47)"/>
      <ellipse cx="30" cy="55" rx="1.8" ry="3.5"  fill={bud} opacity="0.43" transform="rotate(-8 30 55)"/>
      <ellipse cx="30" cy="62" rx="1.5" ry="3"    fill={bud} opacity="0.33" transform="rotate(-8 30 62)"/>
      {/* Center (tallest) */}
      <path d="M45 58 Q44 34 45 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <ellipse cx="45" cy="8"  rx="3.2" ry="6"    fill={bud} opacity="0.92"/>
      <ellipse cx="45" cy="17" rx="3"   ry="5.5"  fill={bud} opacity="0.82"/>
      <ellipse cx="45" cy="26" rx="2.8" ry="5"    fill={bud} opacity="0.72"/>
      <ellipse cx="45" cy="35" rx="2.5" ry="4.5"  fill={bud} opacity="0.62"/>
      <ellipse cx="45" cy="43" rx="2.2" ry="4"    fill={bud} opacity="0.52"/>
      <ellipse cx="45" cy="51" rx="2"   ry="3.5"  fill={bud} opacity="0.42"/>
      {/* Right-center */}
      <path d="M57 65 Q58 44 58 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="58" cy="20" rx="3"   ry="5.5"  fill={bud} opacity="0.90" transform="rotate(8 58 20)"/>
      <ellipse cx="58" cy="29" rx="2.7" ry="5"    fill={bud} opacity="0.78" transform="rotate(8 58 29)"/>
      <ellipse cx="58" cy="38" rx="2.4" ry="4.5"  fill={bud} opacity="0.66" transform="rotate(8 58 38)"/>
      <ellipse cx="58" cy="47" rx="2.1" ry="4"    fill={bud} opacity="0.54" transform="rotate(8 58 47)"/>
      <ellipse cx="58" cy="55" rx="1.8" ry="3.5"  fill={bud} opacity="0.43" transform="rotate(8 58 55)"/>
      <ellipse cx="58" cy="62" rx="1.5" ry="3"    fill={bud} opacity="0.33" transform="rotate(8 58 62)"/>
      {/* Far right */}
      <path d="M70 70 Q73 50 73 28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="73" cy="30" rx="2.8" ry="5.2" fill={bud} opacity="0.88" transform="rotate(18 73 30)"/>
      <ellipse cx="73" cy="39" rx="2.5" ry="4.6" fill={bud} opacity="0.76" transform="rotate(18 73 39)"/>
      <ellipse cx="73" cy="48" rx="2.2" ry="4"   fill={bud} opacity="0.64" transform="rotate(18 73 48)"/>
      <ellipse cx="73" cy="56" rx="2"   ry="3.5"  fill={bud} opacity="0.52" transform="rotate(18 73 56)"/>
      <ellipse cx="73" cy="63" rx="1.7" ry="3"    fill={bud} opacity="0.40" transform="rotate(18 73 63)"/>
      {/* Pollen dots */}
      <circle cx="8"  cy="48"  r="1.4" fill={bud} opacity="0.42"/>
      <circle cx="82" cy="43"  r="1.1" fill={bud} opacity="0.36"/>
      <circle cx="5"  cy="74"  r="0.9" fill={bud} opacity="0.28"/>
      <circle cx="85" cy="78"  r="1"   fill={bud} opacity="0.30"/>
    </svg>
  );
}

function PotionBottle({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 65 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="32" y="9" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.70" fontFamily="serif">✦</text>
      <circle cx="18" cy="14" r="1.5" fill="currentColor" opacity="0.46"/>
      <circle cx="48" cy="12" r="1"   fill="currentColor" opacity="0.38"/>
      {/* Cork */}
      <rect x="22" y="16" width="22" height="16" rx="4.5" fill="currentColor" opacity="0.80"/>
      <line x1="22" y1="21" x2="44" y2="21" stroke="currentColor" strokeWidth="0.5" opacity="0.26"/>
      <line x1="22" y1="25" x2="44" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.26"/>
      <line x1="22" y1="29" x2="44" y2="29" stroke="currentColor" strokeWidth="0.5" opacity="0.26"/>
      {/* Neck */}
      <rect x="24" y="32" width="18" height="18" rx="1" fill="currentColor" fillOpacity="0.10" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="26" y="34" width="5" height="14" rx="2.5" fill="currentColor" fillOpacity="0.18"/>
      {/* String + label */}
      <path d="M24 38 Q33 35 42 38" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M42 38 Q50 45 48 54" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <path d="M48 54 Q55 57 53 66 Q51 70 46 68 Q41 66 43 59 Q45 55 48 54 Z"
        fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="0.9"/>
      <circle cx="48" cy="56" r="1.5" fill="currentColor" opacity="0.68"/>
      <text x="48" y="65" textAnchor="middle" fontSize="5" fill="currentColor" opacity="0.58" fontFamily="serif">✦</text>
      {/* Round bottle body */}
      <ellipse cx="32" cy="96" rx="28" ry="30" fill="currentColor" fillOpacity="0.09" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M24 50 Q6 60 4 84"  stroke="currentColor" strokeWidth="1.5"/>
      <path d="M42 50 Q58 60 60 84" stroke="currentColor" strokeWidth="1.5"/>
      {/* Liquid */}
      <path d="M7 102 Q32 95 57 102 L57 126 Q32 132 7 126 Z" fill="currentColor" fillOpacity="0.28"/>
      <path d="M8 103 Q20 98 32 100 Q44 98 56 103"
        stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.48" strokeLinecap="round"/>
      {/* Bubbles */}
      <circle cx="20" cy="108" r="5"   fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.42"/>
      <circle cx="20" cy="108" r="2.2" fill="currentColor" opacity="0.18"/>
      <circle cx="46" cy="94"  r="4"   fill="none" stroke="currentColor" strokeWidth="1"   opacity="0.36"/>
      <circle cx="30" cy="86"  r="3"   fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.30"/>
      <circle cx="52" cy="114" r="2.5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.32"/>
      <circle cx="14" cy="118" r="1.8" fill="currentColor" opacity="0.26"/>
      <circle cx="42" cy="122" r="1.2" fill="currentColor" opacity="0.22"/>
      {/* Shine */}
      <path d="M8  74 Q10 62 14 58" stroke="currentColor" strokeWidth="1.8" opacity="0.48" strokeLinecap="round"/>
      <path d="M10 86 Q11 80 14 77" stroke="currentColor" strokeWidth="1.1" opacity="0.34" strokeLinecap="round"/>
      {/* Measure marks */}
      <line x1="4" y1="106" x2="8" y2="106" stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
      <line x1="3" y1="116" x2="8" y2="116" stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
    </svg>
  );
}

function HerbSachet({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="112" rx="28" ry="4" fill="currentColor" opacity="0.12"/>
      {/* Bag body */}
      <path d="M16 88 Q8 66 14 46 Q20 26 50 24 Q80 26 86 46 Q92 66 84 88 Q72 112 50 112 Q28 112 16 88 Z"
        fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.9"/>
      {/* Stitching */}
      <path d="M19 89 Q12 68 18 48 Q24 29 50 27 Q76 29 82 48 Q88 68 81 89 Q69 112 50 112 Q31 112 19 89 Z"
        fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="4.5 3" opacity="0.28"/>
      {/* Fullness shading */}
      <path d="M10 62 Q5 74 8 84"  stroke="currentColor" strokeWidth="1.3" opacity="0.24" strokeLinecap="round"/>
      <path d="M90 60 Q95 74 92 86" stroke="currentColor" strokeWidth="1.3" opacity="0.24" strokeLinecap="round"/>
      <path d="M25 104 Q50 110 75 104" stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
      {/* Neck */}
      <path d="M30 26 Q50 18 70 26 L68 46 Q50 40 32 46 Z"
        fill="currentColor" fillOpacity="0.24" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M33 28 Q50 22 67 28" stroke="currentColor" strokeWidth="0.8" opacity="0.36"/>
      <path d="M32 35 Q50 29 68 35" stroke="currentColor" strokeWidth="0.8" opacity="0.30"/>
      <path d="M32 41 Q50 35 68 41" stroke="currentColor" strokeWidth="0.7" opacity="0.24"/>
      {/* Bow loops */}
      <path d="M36 24 Q20 12 24 2 Q30 -4 40 5 Q45 13 42 22"
        fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M64 24 Q80 12 76 2 Q70 -4 60 5 Q55 13 58 22"
        fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Knot */}
      <ellipse cx="50" cy="22" rx="8"   ry="5.5" fill="currentColor" opacity="0.68"/>
      <ellipse cx="50" cy="22" rx="4.5" ry="3"   fill="currentColor" opacity="0.28"/>
      {/* Tails */}
      <path d="M44 26 Q40 38 42 48" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M56 26 Q60 38 58 48" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Coins peeking */}
      <ellipse cx="42" cy="18" rx="4.5" ry="2.5" fill="currentColor" opacity="0.50" transform="rotate(-28 42 18)"/>
      <ellipse cx="58" cy="18" rx="4.5" ry="2.5" fill="currentColor" opacity="0.45" transform="rotate(22 58 18)"/>
      {/* Embossed front */}
      <circle cx="40" cy="74" r="14" stroke="currentColor" strokeWidth="1.1" opacity="0.34"/>
      <circle cx="40" cy="74" r="9"  stroke="currentColor" strokeWidth="0.7" opacity="0.24"/>
      <text x="40" y="79" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.42" fontFamily="serif">✦</text>
      <circle cx="66" cy="68" r="10" stroke="currentColor" strokeWidth="0.9" opacity="0.28"/>
      <text x="66" y="72" textAnchor="middle" fontSize="8"  fill="currentColor" opacity="0.36" fontFamily="serif">◈</text>
    </svg>
  );
}

function CrescentMoon({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 55 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 5 Q8 7 5 32 Q2 57 36 62 Q22 54 20 34 Q18 12 38 5 Z" fill="currentColor" opacity="0.70"/>
      <path d="M36 10 Q16 14 16 34 Q16 52 34 58"
        stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.32" strokeLinecap="round"/>
      <text x="47" y="16" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.78" fontFamily="serif">✦</text>
      <text x="50" y="38" textAnchor="middle" fontSize="7"  fill="currentColor" opacity="0.58" fontFamily="serif">✧</text>
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

export function SpellbookBg() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>

      {/* ═══ SAROK / CORNER ELEMENTS ═══ */}

      {/* Bal felső sarok — nagy levendula csokor */}
      <El style={{ top: -28, left: -22, transform: "rotate(-16deg)", opacity: 0.20, color: SEPIA }}>
        <LavenderBundle width={110} height={220} />
      </El>

      {/* Jobb felső sarok — sarló hold */}
      <El style={{ top: 6, right: 14, transform: "rotate(8deg)", opacity: 0.22, color: SEPIA }}>
        <CrescentMoon width={56} height={68} />
      </El>

      {/* Bal alsó sarok — kis levendula (fejjel le) */}
      <El style={{ bottom: -28, left: 55, transform: "rotate(15deg)", opacity: 0.15, color: SEPIA }}>
        <LavenderBundle width={75} height={155} />
      </El>

      {/* Jobb alsó sarok — sarló hold (tükrözve) */}
      <El style={{ bottom: 12, right: 14, transform: "rotate(-10deg) scaleX(-1)", opacity: 0.18, color: SEPIA }}>
        <CrescentMoon width={48} height={58} />
      </El>

      {/* ═══ KÖZÉP AKCENTUSOK ═══ */}

      {/* Szétszórt csillagok */}
      <El style={{ top: "7%", right: "28%", opacity: 0.18, color: SEPIA }}>
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
          <text x="8"  y="18" fontSize="13" fill="currentColor" opacity="0.80" fontFamily="serif">✦</text>
          <text x="38" y="42" fontSize="8"  fill="currentColor" opacity="0.60" fontFamily="serif">✧</text>
          <text x="52" y="16" fontSize="10" fill="currentColor" opacity="0.68" fontFamily="serif">◈</text>
        </svg>
      </El>

    </div>
  );
}
