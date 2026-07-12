"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "~/app/_theme-toggle";
import { useTheme } from "~/app/_theme-provider";
import { logout } from "./_actions";

const NAV_ADMIN = [
  { key: "dashboard",    icon: "🔮", label: "Irányítópult",   href: "/dashboard" },
  { key: "calendar",     icon: "🌙", label: "Munkanaptár",    href: "/dashboard/calendar" },
  { key: "clients",      icon: "📖", label: "Recept könyv",   href: "/dashboard/guests" },
  { key: "finances",     icon: "⚗️", label: "Pénzügyek",      href: "/dashboard/finances" },
  { key: "expenses",     icon: "📜", label: "Kiadások",       href: "/dashboard/expenses" },
  { key: "services",     icon: "✄", label: "Szolgáltatások", href: "/dashboard/services" },
  { key: "statisztika",  icon: "📊", label: "Statisztika",    href: "/dashboard/statisztika" },
  { key: "admin",        icon: "⚙️", label: "Admin",          href: "/dashboard/admin" },
];

const NAV_STAFF = [
  { key: "dashboard",    icon: "🔮", label: "Irányítópult",   href: "/dashboard" },
  { key: "calendar",     icon: "🌙", label: "Munkanaptár",    href: "/dashboard/calendar" },
  { key: "finances",     icon: "⚗️", label: "Pénzügyek",      href: "/dashboard/finances" },
  { key: "clients",      icon: "📖", label: "Recept könyv",   href: "/dashboard/guests" },
  { key: "expenses",     icon: "📜", label: "Saját kiadások", href: "/dashboard/expenses" },
  { key: "services",     icon: "✄", label: "Árlista",        href: "/dashboard/services" },
];

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const S_DARK = {
  gold:         "#c8a840",
  goldBright:   "#e8c84a",
  goldDim:      "rgba(200,168,64,0.50)",
  goldFaint:    "rgba(200,168,64,0.16)",
  text:         "rgba(240,228,204,0.80)",
  textBright:   "#f0e4cc",
  textDim:      "rgba(240,228,204,0.42)",
  activeColor:  "#c4a0f0",
  activeBg:     "rgba(110,60,200,0.22)",
  activeBorder: "rgba(140,80,220,0.55)",
  activeGlow:   "0 0 18px rgba(110,60,200,0.30), inset 0 0 14px rgba(100,50,180,0.12)",
  hoverBg:      "rgba(200,168,64,0.08)",
  border:       "rgba(200,168,64,0.12)",
};

const S_LIGHT = {
  gold:         "#8a5a20",
  goldBright:   "#a06a28",
  goldDim:      "rgba(122,80,32,0.55)",
  goldFaint:    "rgba(122,80,32,0.18)",
  text:         "rgba(26,14,6,0.72)",
  textBright:   "#1a0e06",
  textDim:      "rgba(26,14,6,0.40)",
  activeColor:  "#6a4a9a",
  activeBg:     "rgba(106,74,154,0.14)",
  activeBorder: "rgba(106,74,154,0.42)",
  activeGlow:   "0 0 18px rgba(106,74,154,0.18), inset 0 0 14px rgba(90,60,140,0.08)",
  hoverBg:      "rgba(122,80,32,0.08)",
  border:       "rgba(122,80,32,0.12)",
};

export default function SidebarLayout({
  user,
  activeKey,
  children,
}: {
  user: { name?: string | null; email?: string | null; role?: string | null };
  activeKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const S = theme === "dark" ? S_DARK : S_LIGHT;
  const NAV = user.role === "admin" ? NAV_ADMIN : NAV_STAFF;
  const [open, setOpen] = useState(false);

  // Mobil: navigálás közben zárjuk a drawert
  const go = (href?: string) => {
    setOpen(false);
    if (href) router.push(href);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--color-bg)" }}>

      {/* ── Hamburger (csak mobilon látszik) ── */}
      <button
        className="sb-hamburger"
        aria-label="Menü"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      {/* ── Sötétítő háttér (csak mobilon, nyitott drawernél) ── */}
      {open && <div className="sb-backdrop" onClick={() => setOpen(false)} />}

      {/* ── Sidebar ── */}
      <nav
        className={`sb-nav${open ? " sb-open" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "0 1rem 1.25rem",
          background: "var(--bg-sidebar)",
          borderRight: `1px solid ${S.border}`,
          overflowY: "auto",
        }}
      >

        {/* ── Spell Book header ── */}
        <div
          style={{ textAlign: "center", padding: "1.5rem 0 1.2rem", cursor: "pointer" }}
          onClick={() => go("/dashboard")}
        >
          <div style={{
            fontSize: "1.8rem", lineHeight: 1, marginBottom: "0.4rem",
            animation: "float 4s ease-in-out infinite",
            filter: "drop-shadow(0 0 10px rgba(200,168,64,0.65))",
            color: S.gold,
          }}>◆</div>
          <div style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.95rem",
            letterSpacing: "0.26em",
            color: S.gold,
            textTransform: "uppercase",
            marginBottom: "0.18rem",
          }}>Spell Book</div>
          <div style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "0.74rem",
            color: S.goldDim,
            fontStyle: "italic",
            letterSpacing: "0.1em",
          }}>Hair Magic Studio</div>
        </div>

        {/* Ornamental divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem", padding: "0 0.25rem" }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${S.goldFaint})` }} />
          <span style={{ color: S.goldDim, fontSize: "0.55rem" }}>✦</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${S.goldFaint})` }} />
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.18rem" }}>
          {NAV.map(({ key, icon, label, href }) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => href ? go(href) : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  padding: "0.58rem 1rem",
                  borderRadius: "7px",
                  cursor: href ? "pointer" : "default",
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "1.05rem",
                  letterSpacing: "0.05em",
                  border: isActive ? `1px solid ${S.activeBorder}` : "1px solid transparent",
                  background: isActive ? S.activeBg : "transparent",
                  color: isActive ? S.activeColor : href ? S.text : S.textDim,
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? S.activeGlow : "none",
                  transition: "all 0.2s",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={e => {
                  if (!isActive && href) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = S.hoverBg;
                    el.style.color = S.goldBright;
                    el.style.borderColor = S.goldFaint;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "transparent";
                    el.style.color = href ? S.text : S.textDim;
                    el.style.borderColor = "transparent";
                  }
                }}
              >
                <span style={{
                  fontSize: "1rem",
                  flexShrink: 0,
                  filter: isActive ? "drop-shadow(0 0 6px rgba(140,80,240,0.85))" : "none",
                  transition: "all 0.2s",
                  opacity: isActive ? 1 : 0.75,
                }}>
                  {icon}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Thin gold divider above user */}
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${S.goldFaint}, transparent)`, margin: "0.75rem 0.5rem" }} />

        {/* ── User profile ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0 0.5rem", marginBottom: "0.6rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: `linear-gradient(135deg, ${S.gold} 0%, #9060a8 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-cinzel)", fontSize: "0.72rem",
            color: "#1a0e06", fontWeight: 600,
            border: `1px solid ${S.goldFaint}`,
            flexShrink: 0,
          }}>
            {initials(user.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.88rem", color: S.textBright, fontFamily: "var(--font-cormorant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Logout button ── */}
        <button
          onClick={() => logout()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            width: "100%", padding: "0.6rem 1rem",
            borderRadius: 8,
            border: "1px solid rgba(200,80,80,0.35)",
            background: "rgba(200,80,80,0.10)",
            color: "#e09090",
            fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "rgba(200,80,80,0.22)";
            el.style.borderColor = "rgba(200,80,80,0.60)";
            el.style.color = "#f0a0a0";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "rgba(200,80,80,0.10)";
            el.style.borderColor = "rgba(200,80,80,0.35)";
            el.style.color = "#e09090";
          }}
        >
          ↪ Kilépés
        </button>
      </nav>

      {/* ── Main content ── */}
      <main className="sb-main">
        {children}
      </main>
    </div>
  );
}
