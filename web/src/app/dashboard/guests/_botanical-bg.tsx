// Magical botanical background for Recept könyv — based on the fantasy plant grimoire image
// Elements: twisting magic plant, galaxy flowers, crystals, glowing beetles, eggs, sun icon

const SEPIA  = "var(--color-teal)";
const GLOW   = "#8878c8"; // mystical purple/blue for galaxy petals
const GOLD   = "#c09020"; // gold for sun and crystals

/** Twisting magical plant with galaxy flowers */
function MagicPlant({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Root system */}
      <path d="M80 290 Q75 278 70 268" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M70 268 Q60 258 52 248" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M70 268 Q72 256 75 244" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M52 248 Q42 240 36 232" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M52 248 Q50 238 52 228" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M36 232 Q28 226 22 218" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M75 244 Q80 234 82 222" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M82 222 Q88 212 92 200" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M82 222 Q75 214 70 204" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      {/* Root spore dots */}
      <circle cx="22"  cy="218" r="2.5" fill="currentColor" opacity="0.50"/>
      <circle cx="36"  cy="232" r="2"   fill="currentColor" opacity="0.45"/>
      <circle cx="92"  cy="200" r="2.2" fill="currentColor" opacity="0.48"/>
      <circle cx="70"  cy="204" r="1.8" fill="currentColor" opacity="0.42"/>

      {/* Main twisted stem */}
      <path d="M80 270 Q72 240 76 210 Q80 180 74 150 Q68 120 80 90 Q88 65 76 40"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      {/* Secondary stem branch */}
      <path d="M78 160 Q96 140 108 110 Q118 84 110 60"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      {/* Stem curl tendrils */}
      <path d="M76 190 Q60 182 52 172 Q44 162 50 152 Q56 144 64 152"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M80 130 Q100 124 106 114 Q112 104 104 96 Q96 90 90 98"
        stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M76 60 Q62 52 58 40 Q54 28 64 24 Q72 20 74 32"
        stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>

      {/* ── Large galaxy flower (left, mid) ── */}
      {/* Outer halo glow */}
      <circle cx="64" cy="130" r="42" fill={GLOW} fillOpacity="0.06"/>
      <circle cx="64" cy="130" r="34" fill={GLOW} fillOpacity="0.08"/>
      {/* 6 outer petals — ellipses rotated around center */}
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(0)"/>
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(60)"/>
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(120)"/>
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(180)"/>
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(240)"/>
      <ellipse cx="0" cy="-28" rx="11" ry="26" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.3" opacity="0.80" transform="translate(64,130) rotate(300)"/>
      {/* 6 inner petals at 30° offset */}
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(30)"/>
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(90)"/>
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(150)"/>
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(210)"/>
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(270)"/>
      <ellipse cx="0" cy="-20" rx="7" ry="17" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9" opacity="0.65" transform="translate(64,130) rotate(330)"/>
      {/* Petal veins */}
      <line x1="64" y1="130" x2="64" y2="97"  stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      <line x1="64" y1="130" x2="91" y2="114" stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      <line x1="64" y1="130" x2="91" y2="146" stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      <line x1="64" y1="130" x2="64" y2="163" stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      <line x1="64" y1="130" x2="37" y2="146" stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      <line x1="64" y1="130" x2="37" y2="114" stroke={GLOW} strokeWidth="0.7" opacity="0.35"/>
      {/* Center orb */}
      <circle cx="64" cy="130" r="14" fill={GLOW} fillOpacity="0.22" stroke={GLOW} strokeWidth="1.6"/>
      <circle cx="64" cy="130" r="9"  fill={GLOW} fillOpacity="0.50"/>
      <circle cx="64" cy="130" r="5"  fill="currentColor" opacity="0.72"/>
      <circle cx="61" cy="127" r="2.5" fill="currentColor" fillOpacity="0.35"/>
      {/* Petal-tip dots */}
      <circle cx="64" cy="97"  r="2.5" fill={GLOW} opacity="0.60"/>
      <circle cx="91" cy="114" r="2"   fill={GLOW} opacity="0.55"/>
      <circle cx="91" cy="146" r="2"   fill={GLOW} opacity="0.55"/>
      <circle cx="64" cy="163" r="2.5" fill={GLOW} opacity="0.60"/>
      <circle cx="37" cy="146" r="2"   fill={GLOW} opacity="0.55"/>
      <circle cx="37" cy="114" r="2"   fill={GLOW} opacity="0.55"/>
      {/* Sparkles between petals */}
      <text x="44" y="106" fontSize="6" fill={GLOW} opacity="0.80" fontFamily="serif">✦</text>
      <text x="80" y="106" fontSize="5" fill={GLOW} opacity="0.65" fontFamily="serif">✧</text>
      <text x="93" y="133" fontSize="5" fill={GLOW} opacity="0.65" fontFamily="serif">✦</text>
      <text x="76" y="158" fontSize="6" fill={GLOW} opacity="0.70" fontFamily="serif">✧</text>
      <text x="37" y="158" fontSize="5" fill={GLOW} opacity="0.65" fontFamily="serif">✦</text>
      <text x="23" y="133" fontSize="5" fill={GLOW} opacity="0.60" fontFamily="serif">✧</text>
      {/* Glowing droplet */}
      <path d="M37 146 Q34 154 36 161" stroke={GLOW} strokeWidth="1.2" fill="none" opacity="0.60" strokeLinecap="round"/>
      <ellipse cx="36" cy="163" rx="3" ry="4.5" fill={GLOW} fillOpacity="0.38"/>

      {/* ── Second galaxy flower (right, upper) ── */}
      {/* Outer halo */}
      <circle cx="112" cy="78" r="30" fill={GLOW} fillOpacity="0.06"/>
      {/* 6 outer petals */}
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(0)"/>
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(60)"/>
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(120)"/>
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(180)"/>
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(240)"/>
      <ellipse cx="0" cy="-20" rx="8" ry="18" fill={GLOW} fillOpacity="0.26" stroke={GLOW} strokeWidth="1.1" opacity="0.75" transform="translate(112,78) rotate(300)"/>
      {/* 6 inner petals */}
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(30)"/>
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(90)"/>
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(150)"/>
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(210)"/>
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(270)"/>
      <ellipse cx="0" cy="-14" rx="5" ry="12" fill={GLOW} fillOpacity="0.18" stroke={GLOW} strokeWidth="0.8" opacity="0.60" transform="translate(112,78) rotate(330)"/>
      {/* Center orb */}
      <circle cx="112" cy="78" r="10" fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="1.3"/>
      <circle cx="112" cy="78" r="6"  fill={GLOW} fillOpacity="0.45"/>
      <circle cx="112" cy="78" r="3"  fill="currentColor" opacity="0.70"/>
      <circle cx="110" cy="76" r="1.8" fill="currentColor" fillOpacity="0.30"/>
      {/* Tip dots */}
      <circle cx="112" cy="57" r="1.8" fill={GLOW} opacity="0.55"/>
      <circle cx="131" cy="67" r="1.5" fill={GLOW} opacity="0.50"/>
      <circle cx="131" cy="89" r="1.5" fill={GLOW} opacity="0.50"/>
      <circle cx="112" cy="99" r="1.8" fill={GLOW} opacity="0.55"/>
      <circle cx="93"  cy="89" r="1.5" fill={GLOW} opacity="0.50"/>
      <circle cx="93"  cy="67" r="1.5" fill={GLOW} opacity="0.50"/>
      {/* Sparkles */}
      <text x="121" y="60" fontSize="6" fill={GLOW} opacity="0.75" fontFamily="serif">✦</text>
      <text x="95"  y="61" fontSize="5" fill={GLOW} opacity="0.60" fontFamily="serif">✧</text>
      <text x="133" y="82" fontSize="4" fill={GLOW} opacity="0.55" fontFamily="serif">✦</text>

      {/* ── Leaves — pointed, blue-green tinted ── */}
      <path d="M76 200 Q48 188 38 168 Q52 176 76 200" fill={GLOW} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M76 200 Q100 192 112 174 Q98 180 76 200" fill={GLOW} fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M76 155 Q54 142 46 122 Q60 132 76 155" fill={GLOW} fillOpacity="0.16" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M78 100 Q58 90 50 72 Q64 82 78 100" fill={GLOW} fillOpacity="0.15" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M78 100 Q100 90 108 72 Q94 82 78 100" fill={GLOW} fillOpacity="0.14" stroke="currentColor" strokeWidth="1.1"/>
      {/* Leaf veins */}
      <path d="M76 200 Q60 186 38 168" stroke="currentColor" strokeWidth="0.7" opacity="0.28"/>
      <path d="M76 155 Q58 140 46 122" stroke="currentColor" strokeWidth="0.7" opacity="0.26"/>

      {/* ── Crystal cluster at base ── */}
      <path d="M58 262 Q52 244 56 230 L62 244 Z" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.1"/>
      <path d="M66 264 Q60 242 64 224 L70 246 Z" fill={GLOW} fillOpacity="0.35" stroke={GLOW} strokeWidth="1.2"/>
      <path d="M74 260 Q70 246 72 232 L77 248 Z" fill={GLOW} fillOpacity="0.28" stroke={GLOW} strokeWidth="1.1"/>
      <path d="M82 262 Q78 248 80 236 L85 250 Z" fill={GLOW} fillOpacity="0.22" stroke={GLOW} strokeWidth="1"/>
      {/* Crystal sparkles */}
      <text x="55" y="226" fontSize="6" fill={GLOW} opacity="0.72" fontFamily="serif">✦</text>
      <text x="72" y="228" fontSize="5" fill={GLOW} opacity="0.65" fontFamily="serif">✧</text>
      <text x="84" y="232" fontSize="4" fill={GLOW} opacity="0.58" fontFamily="serif">✦</text>

      {/* ── Scattered sparkles ── */}
      <text x="20" y="160" fontSize="8"  fill={GLOW} opacity="0.55" fontFamily="serif">✦</text>
      <text x="130" y="100" fontSize="6" fill={GLOW} opacity="0.50" fontFamily="serif">✧</text>
      <text x="30"  y="120" fontSize="5" fill={GLOW} opacity="0.45" fontFamily="serif">◈</text>
      <circle cx="32" cy="145" r="2"   fill={GLOW} opacity="0.45"/>
      <circle cx="128" cy="120" r="1.5" fill={GLOW} opacity="0.40"/>
      <circle cx="22"  cy="175" r="1.8" fill={GLOW} opacity="0.38"/>
    </svg>
  );
}

/** Glowing beetle / magical insect */
function MagicBeetle({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wings */}
      <path d="M30 28 Q8 18 4 36 Q8 50 30 44 Z"
        fill={GLOW} fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M30 28 Q52 18 56 36 Q52 50 30 44 Z"
        fill={GLOW} fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2"/>
      {/* Wing shimmer lines */}
      <path d="M20 30 Q16 38 18 44" stroke={GLOW} strokeWidth="0.7" opacity="0.50" strokeLinecap="round"/>
      <path d="M40 30 Q44 38 42 44" stroke={GLOW} strokeWidth="0.7" opacity="0.50" strokeLinecap="round"/>
      {/* Body */}
      <ellipse cx="30" cy="38" rx="8"  ry="14"
        fill={GLOW} fillOpacity="0.30" stroke="currentColor" strokeWidth="1.4"/>
      <ellipse cx="30" cy="34" rx="6"  ry="8"
        fill={GLOW} fillOpacity="0.20" stroke="currentColor" strokeWidth="1"/>
      {/* Head */}
      <circle cx="30" cy="24" r="6"
        fill={GLOW} fillOpacity="0.35" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="27" cy="22" r="2" fill="currentColor" opacity="0.65"/>
      <circle cx="33" cy="22" r="2" fill="currentColor" opacity="0.65"/>
      {/* Antennae */}
      <path d="M28 18 Q22 10 16 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M32 18 Q38 10 44 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <circle cx="16" cy="6" r="2" fill="currentColor" opacity="0.60"/>
      <circle cx="44" cy="6" r="2" fill="currentColor" opacity="0.60"/>
      {/* Leg pairs */}
      <path d="M24 36 Q14 34 8 38"  stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M24 42 Q14 42 8 48"  stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M36 36 Q46 34 52 38" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M36 42 Q46 42 52 48" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      {/* Sparkle glow */}
      <text x="30" y="68" textAnchor="middle" fontSize="7" fill={GLOW} opacity="0.70" fontFamily="serif">✦</text>
      <circle cx="18" cy="28" r="1.5" fill={GLOW} opacity="0.55"/>
      <circle cx="42" cy="28" r="1.5" fill={GLOW} opacity="0.55"/>
    </svg>
  );
}

/** Glowing eggs / seed pods */
function GlowEggs({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 90 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pod outline */}
      <path d="M4 38 Q4 10 22 8 Q40 6 40 38 Z"
        fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.4"/>
      {/* Three eggs inside */}
      <ellipse cx="18" cy="28" rx="8" ry="11"
        fill={GLOW} fillOpacity="0.30" stroke={GLOW} strokeWidth="1.1"/>
      <ellipse cx="28" cy="30" rx="7" ry="10"
        fill={GLOW} fillOpacity="0.25" stroke={GLOW} strokeWidth="1"/>
      <ellipse cx="12" cy="32" rx="6" ry="8"
        fill={GLOW} fillOpacity="0.20" stroke={GLOW} strokeWidth="0.9"/>
      {/* Egg shines */}
      <ellipse cx="16" cy="23" rx="2.5" ry="3.5" fill="currentColor" fillOpacity="0.35" transform="rotate(-20 16 23)"/>
      <ellipse cx="26" cy="25" rx="2"   ry="3"   fill="currentColor" fillOpacity="0.30" transform="rotate(-15 26 25)"/>
      {/* Sparkles */}
      <text x="50" y="22" fontSize="12" fill={GLOW} opacity="0.75" fontFamily="serif">✦</text>
      <text x="68" y="38" fontSize="8"  fill={GLOW} opacity="0.60" fontFamily="serif">✧</text>
      <text x="75" y="14" fontSize="7"  fill={GLOW} opacity="0.55" fontFamily="serif">◈</text>
      <circle cx="82" cy="28" r="2"   fill={GLOW} opacity="0.50"/>
      <circle cx="58" cy="38" r="1.5" fill={GLOW} opacity="0.44"/>
    </svg>
  );
}

/** Small sun icon (top-left corner like in the nap image) */
function SunSketch({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer glow ring */}
      <circle cx="35" cy="35" r="30" stroke={GOLD} strokeWidth="0.8" opacity="0.30" strokeDasharray="3 2"/>
      {/* Sun face circle */}
      <circle cx="35" cy="35" r="18" fill={GOLD} fillOpacity="0.18" stroke={GOLD} strokeWidth="1.5"/>
      <circle cx="35" cy="35" r="12" fill={GOLD} fillOpacity="0.28"/>
      {/* Face details */}
      <circle cx="30" cy="32" r="2" fill="currentColor" opacity="0.55"/>
      <circle cx="40" cy="32" r="2" fill="currentColor" opacity="0.55"/>
      <path d="M29 40 Q35 44 41 40" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
      {/* Rays */}
      <line x1="35" y1="4"  x2="35" y2="13" stroke={GOLD} strokeWidth="2"   strokeLinecap="round" opacity="0.75"/>
      <line x1="35" y1="57" x2="35" y2="66" stroke={GOLD} strokeWidth="2"   strokeLinecap="round" opacity="0.75"/>
      <line x1="4"  y1="35" x2="13" y2="35" stroke={GOLD} strokeWidth="2"   strokeLinecap="round" opacity="0.75"/>
      <line x1="57" y1="35" x2="66" y2="35" stroke={GOLD} strokeWidth="2"   strokeLinecap="round" opacity="0.75"/>
      <line x1="13" y1="13" x2="19" y2="19" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.60"/>
      <line x1="51" y1="51" x2="57" y2="57" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.60"/>
      <line x1="57" y1="13" x2="51" y2="19" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.60"/>
      <line x1="19" y1="51" x2="13" y2="57" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.60"/>
      {/* Wavy lines around sun (like in nap image) */}
      <path d="M35 2 Q38 0 35 -2" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.40"/>
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

export function BotanicalBg() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>

      {/* ── Fő mágikus növény — bal alsó sarokból felfelé ── */}
      <El style={{ bottom: -20, left: 15, transform: "rotate(-5deg)", opacity: 0.18, color: SEPIA }}>
        <MagicPlant width={190} height={356} />
      </El>

      {/* ── Kisebb növény — jobb felső ── */}
      <El style={{ top: -30, right: 20, transform: "rotate(170deg)", opacity: 0.14, color: SEPIA }}>
        <MagicPlant width={130} height={244} />
      </El>

      {/* ── Nap ikon — bal felső sarok (mint a képen) ── */}
      <El style={{ top: 12, left: 55, transform: "rotate(-8deg)", opacity: 0.22, color: SEPIA }}>
        <SunSketch width={72} height={72} />
      </El>

      {/* ── Mágikus bogár — jobb él, felső harmad ── */}
      <El style={{ top: "16%", right: 12, transform: "rotate(12deg)", opacity: 0.18, color: SEPIA }}>
        <MagicBeetle width={68} height={80} />
      </El>

      {/* ── Másik bogár — jobb él, középen ── */}
      <El style={{ top: "50%", right: 8, transform: "rotate(-8deg)", opacity: 0.15, color: SEPIA }}>
        <MagicBeetle width={52} height={60} />
      </El>

      {/* ── Tojások / magok — alul jobb ── */}
      <El style={{ bottom: 18, right: "18%", transform: "rotate(6deg)", opacity: 0.18, color: SEPIA }}>
        <GlowEggs width={100} height={50} />
      </El>

      {/* ── Tojások — bal középen ── */}
      <El style={{ top: "42%", left: 20, transform: "rotate(-10deg)", opacity: 0.14, color: SEPIA }}>
        <GlowEggs width={75} height={38} />
      </El>

      {/* ── Szétszórt csillagok / galaxy sziporkák ── */}
      <El style={{ top: "8%", right: "32%", opacity: 0.20, color: GLOW }}>
        <svg width="70" height="60" viewBox="0 0 70 60" fill="none">
          <text x="4"  y="18" fontSize="13" fill="currentColor" opacity="0.78" fontFamily="serif">✦</text>
          <text x="36" y="42" fontSize="8"  fill="currentColor" opacity="0.60" fontFamily="serif">✧</text>
          <text x="52" y="16" fontSize="10" fill="currentColor" opacity="0.68" fontFamily="serif">◈</text>
          <circle cx="28" cy="50" r="2"   fill="currentColor" opacity="0.50"/>
          <circle cx="60" cy="36" r="1.5" fill="currentColor" opacity="0.44"/>
        </svg>
      </El>
      <El style={{ bottom: "25%", left: "38%", opacity: 0.15, color: GLOW }}>
        <svg width="55" height="50" viewBox="0 0 55 50" fill="none">
          <text x="4"  y="16" fontSize="10" fill="currentColor" opacity="0.72" fontFamily="serif">✧</text>
          <text x="28" y="36" fontSize="12" fill="currentColor" opacity="0.78" fontFamily="serif">✦</text>
          <text x="44" y="14" fontSize="7"  fill="currentColor" opacity="0.56" fontFamily="serif">◈</text>
        </svg>
      </El>
      <El style={{ top: "30%", right: "24%", opacity: 0.12, color: GLOW }}>
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <text x="4"  y="16" fontSize="8"  fill="currentColor" opacity="0.65" fontFamily="serif">✦</text>
          <text x="26" y="32" fontSize="10" fill="currentColor" opacity="0.70" fontFamily="serif">✧</text>
        </svg>
      </El>

    </div>
  );
}
