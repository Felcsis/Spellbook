"use client";
import { useTheme } from "./_theme-provider";

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 55 65" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 4px rgba(184,152,112,0.5))" }}>
      <path d="M38 5 Q8 7 5 32 Q2 57 36 62 Q22 54 20 34 Q18 12 38 5 Z"
        fill="currentColor" opacity="0.85"/>
      <path d="M36 10 Q16 14 16 34 Q16 52 34 58"
        stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round"/>
      <text x="47" y="17" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.90" fontFamily="serif">✦</text>
      <text x="51" y="38" textAnchor="middle" fontSize="7"  fill="currentColor" opacity="0.70" fontFamily="serif">✧</text>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 4px rgba(184,152,72,0.5))" }}>
      {/* Center circle */}
      <circle cx="30" cy="30" r="10" fill="currentColor" opacity="0.88"/>
      <circle cx="30" cy="30" r="7"  fill="currentColor" opacity="0.40"/>
      {/* Rays — 8 directions */}
      <line x1="30" y1="6"  x2="30" y2="14" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" opacity="0.80"/>
      <line x1="30" y1="46" x2="30" y2="54" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" opacity="0.80"/>
      <line x1="6"  y1="30" x2="14" y2="30" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" opacity="0.80"/>
      <line x1="46" y1="30" x2="54" y2="30" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" opacity="0.80"/>
      <line x1="13" y1="13" x2="19" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
      <line x1="41" y1="41" x2="47" y2="47" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
      <line x1="47" y1="13" x2="41" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
      <line x1="19" y1="41" x2="13" y2="47" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
      {/* Small dots between rays */}
      <circle cx="30" cy="4"  r="1.2" fill="currentColor" opacity="0.55"/>
      <circle cx="30" cy="56" r="1.2" fill="currentColor" opacity="0.55"/>
      <circle cx="4"  cy="30" r="1.2" fill="currentColor" opacity="0.55"/>
      <circle cx="56" cy="30" r="1.2" fill="currentColor" opacity="0.55"/>
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ color: "var(--color-teal)", opacity: 0.85, animation: dark ? "float 4s ease-in-out infinite" : "none" }}>
        {dark ? <MoonIcon /> : <SunIcon />}
      </span>
      <button
        onClick={toggle}
        title={dark ? "Világos mód" : "Sötét mód"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.85rem",
          borderRadius: "999px",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-cinzel)",
          fontSize: "0.62rem",
          letterSpacing: "0.1em",
          cursor: "pointer",
          transition: "all 0.25s",
          boxShadow: "var(--shadow-card)",
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-teal)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        {dark ? "Világos" : "Sötét"}
      </button>
    </div>
  );
}
