"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "~/app/_theme-toggle";
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
  { key: "services",     icon: "✄", label: "Árlista",        href: "/dashboard/services" },
];

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const S = {
  gold:         "#c8a840",
  goldBright:   "#e8c84a",
  goldDim:      "rgba(200,168,64,0.50)",
  goldFaint:    "rgba(200,168,64,0.16)",
  text:         "rgba(240,228,204,0.80)",
  textBright:   "#f0e4cc",
  textDim:      "rgba(240,228,204,0.42)",
  /* Active = purple, like the spell book mockup */
  activeColor:  "#c4a0f0",
  activeBg:     "rgba(110,60,200,0.22)",
  activeBorder: "rgba(140,80,220,0.55)",
  activeGlow:   "0 0 18px rgba(110,60,200,0.30), inset 0 0 14px rgba(100,50,180,0.12)",
  hoverBg:      "rgba(200,168,64,0.08)",
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
  const NAV = user.role === "admin" ? NAV_ADMIN : NAV_STAFF;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>

      {/* ── Sidebar ── */}
      <nav style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        padding: "0 1rem 1.25rem",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid rgba(200,168,64,0.12)",
        overflowY: "auto",
      }}>

        {/* ── Spell Book header ── */}
        <div
          style={{ textAlign: "center", padding: "1.5rem 0 1.2rem", cursor: "pointer" }}
          onClick={() => router.push("/dashboard")}
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
                onClick={() => href ? router.push(href) : undefined}
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
      <main style={{
        flex: 1,
        position: "relative",
        overflowY: "auto",
        padding: "2.5rem 3rem",
        background: "var(--color-bg2)",
      }}>
        {children}
      </main>
    </div>
  );
}
