"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "~/app/_theme-toggle";

const NAV_ADMIN = [
  { key: "dashboard",    icon: "◈", label: "Főoldal",        href: "/dashboard" },
  { key: "appointments", icon: "✦", label: "Időpontok",      href: null },
  { key: "services",     icon: "✂", label: "Szolgáltatások & Anyagtár", href: "/dashboard/services" },
  { key: "clients",      icon: "♦", label: "Recept könyv",   href: "/dashboard/guests" },
  { key: "finances",     icon: "✧", label: "Pénzügyek",      href: "/dashboard/finances" },
  { key: "calendar",     icon: "◇", label: "Munkanaptár",    href: "/dashboard/calendar" },
];

const NAV_STAFF = [
  { key: "dashboard",    icon: "◈", label: "Főoldal",        href: "/dashboard" },
  { key: "calendar",     icon: "◇", label: "Munkanaptár",    href: "/dashboard/calendar" },
  { key: "finances",     icon: "✧", label: "Bevételeim",     href: "/dashboard/finances" },
];

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

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
    <div className="flex min-h-screen" style={{ background: "var(--color-bg)", animation: "fadeIn 0.5s ease" }}>
      {/* Subtle background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 500, h: 500, top: -120, left: -120,  c: "var(--bg-highlight)", d: "0s" },
          { w: 420, h: 420, bottom: -80, right: -80, c: "var(--bg-highlight)",  d: "-5s" },
          { w: 320, h: 320, top: "42%", left: "55%", c: "var(--bg-highlight)",  d: "-9s" },
        ].map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: o.w, height: o.h,
              top: "top" in o ? (o as { top?: number | string }).top ?? undefined : undefined,
              left: "left" in o ? (o as { left?: number | string }).left ?? undefined : undefined,
              bottom: "bottom" in o ? (o as { bottom?: number }).bottom ?? undefined : undefined,
              right: "right" in o ? (o as { right?: number }).right ?? undefined : undefined,
              background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
              filter: "blur(80px)",
              animation: `orbFloat 16s ease-in-out ${o.d} infinite`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <nav
        className="relative z-10 flex flex-col"
        style={{
          width: 260, flexShrink: 0,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          padding: "2rem 1.25rem",
          boxShadow: "2px 0 24px rgba(74,124,126,0.06)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.95rem",
            color: "var(--color-teal)",
            letterSpacing: "0.14em",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border)",
            marginBottom: "1rem",
            cursor: "pointer",
          }}
          onClick={() => router.push("/dashboard")}
        >
          ✦ Salon Spellbook
        </div>

        <div className="flex flex-col gap-1">
          {NAV.map(({ key, icon, label, href }) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => href ? router.push(href) : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.7rem 1rem", borderRadius: "10px",
                  cursor: href ? "pointer" : "default",
                  fontFamily: "var(--font-cormorant)", fontSize: "1.05rem", letterSpacing: "0.04em",
                  border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                  background: isActive ? "var(--bg-active)" : "transparent",
                  color: isActive ? "var(--color-teal)" : href ? "var(--text-muted)" : "var(--text-dim)",
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? "var(--shadow-card)" : "none",
                  transition: "all 0.22s",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!isActive && href) {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-highlight)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-teal)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = href ? "var(--text-muted)" : "var(--text-dim)";
                  }
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.9rem 1rem",
            borderTop: "1px solid var(--border)",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--color-teal), var(--color-pink))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-cinzel)", fontSize: "0.85rem",
              color: "#fff",
              border: "1px solid var(--border-strong)",
              flexShrink: 0,
            }}
          >
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "var(--font-cormorant)" }}>
              {user.name}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ fontSize: "0.75rem", color: "var(--text-soft)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-cormorant)", padding: 0, transition: "color 0.2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--color-pink)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-soft)"; }}
            >
              Kilépés
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-12">
        {/* Theme toggle — top right */}
        <div style={{ position: "absolute", top: "1.5rem", right: "2rem", zIndex: 20 }}>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
