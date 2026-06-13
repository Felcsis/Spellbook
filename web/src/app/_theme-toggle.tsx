"use client";
import { useTheme } from "./_theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={dark ? "Világos mód" : "Sötét mód"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
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
      <span style={{ fontSize: "0.9rem" }}>{dark ? "☀" : "🌙"}</span>
      {dark ? "Világos" : "Sötét"}
    </button>
  );
}
