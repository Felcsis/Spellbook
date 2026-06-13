"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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
      {/* Subtle background orbs — light pastel tones */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 500, h: 500, top: -120, left: -120, c: "rgba(196,92,122,0.07)", d: "0s" },
          { w: 420, h: 420, bottom: -80, right: -80, c: "rgba(74,124,126,0.07)", d: "-5s" },
          { w: 320, h: 320, top: "42%", left: "55%", c: "rgba(122,140,90,0.06)", d: "-9s" },
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
          background: "rgba(220,210,195,0.92)",
          borderRight: "1px solid rgba(74,124,126,0.18)",
          backdropFilter: "blur(20px)",
          padding: "2rem 1.25rem",
          boxShadow: "2px 0 24px rgba(74,124,126,0.07)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.95rem",
            color: "#4a7c7e",
            letterSpacing: "0.14em",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid rgba(74,124,126,0.15)",
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
                  border: isActive ? "1px solid rgba(74,124,126,0.35)" : "1px solid transparent",
                  background: isActive ? "rgba(74,124,126,0.1)" : "transparent",
                  color: isActive ? "#4a7c7e" : href ? "rgba(44,36,32,0.6)" : "rgba(44,36,32,0.28)",
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? "0 2px 12px rgba(74,124,126,0.1)" : "none",
                  transition: "all 0.22s",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!isActive && href) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(74,124,126,0.07)";
                    (e.currentTarget as HTMLElement).style.color = "#4a7c7e";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = href ? "rgba(44,36,32,0.6)" : "rgba(44,36,32,0.28)";
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
            borderTop: "1px solid rgba(74,124,126,0.15)",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #4a7c7e, #c45c7a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-cinzel)", fontSize: "0.85rem",
              color: "#fff",
              border: "1px solid rgba(74,124,126,0.3)",
              flexShrink: 0,
            }}
          >
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", color: "#2c2420", fontFamily: "var(--font-cormorant)" }}>
              {user.name}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ fontSize: "0.75rem", color: "rgba(44,36,32,0.45)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-cormorant)", padding: 0, transition: "color 0.2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#c45c7a"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "rgba(44,36,32,0.45)"; }}
            >
              Kilépés
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-12">
        {children}
      </main>
    </div>
  );
}
