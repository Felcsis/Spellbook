"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const NAV = [
  { key: "dashboard",    icon: "◈", label: "Főoldal",        href: "/dashboard" },
  { key: "appointments", icon: "✦", label: "Időpontok",      href: null },
  { key: "services",     icon: "✂", label: "Szolgáltatások", href: null },
  { key: "clients",      icon: "♦", label: "Vendégek",       href: null },
  { key: "finances",     icon: "✧", label: "Pénzügyek",      href: "/dashboard/finances" },
  { key: "calendar",     icon: "◇", label: "Munkanaptár",    href: "/dashboard/calendar" },
] as const;

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function SidebarLayout({
  user,
  activeKey,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  activeKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 500, h: 500, top: -100, left: -100,  c: "rgba(124,58,237,0.15)", d: "0s" },
          { w: 400, h: 400, top: null, left: null,   c: "rgba(201,168,76,0.10)", d: "-5s", bottom: -80, right: -80 },
          { w: 340, h: 340, top: "40%", left: "55%", c: "rgba(232,180,200,0.08)", d: "-9s" },
        ].map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: o.w, height: o.h,
              ...(o.top !== null ? { top: o.top } : {}),
              ...(o.left !== null ? { left: o.left } : {}),
              ...("bottom" in o && o.bottom ? { bottom: o.bottom } : {}),
              ...("right" in o && (o as { right?: number }).right ? { right: (o as { right?: number }).right } : {}),
              background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
              filter: "blur(80px)",
              animation: `orbFloat 14s ease-in-out ${o.d} infinite`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <nav
        className="relative z-10 flex flex-col"
        style={{
          width: 260, flexShrink: 0,
          background: "rgba(10,6,20,0.85)",
          borderRight: "1px solid rgba(201,168,76,0.2)",
          backdropFilter: "blur(20px)",
          padding: "2rem 1.25rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.95rem",
            color: "var(--color-gold)",
            letterSpacing: "0.14em",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid rgba(201,168,76,0.18)",
            marginBottom: "1rem",
            textShadow: "0 0 20px rgba(201,168,76,0.35)",
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
                  fontFamily: "var(--font-cormorant)", fontSize: "1rem", letterSpacing: "0.04em",
                  border: isActive ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
                  background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
                  color: isActive ? "var(--color-gold)" : href ? "rgba(245,230,211,0.55)" : "rgba(245,230,211,0.25)",
                  boxShadow: isActive ? "0 0 16px rgba(201,168,76,0.1)" : "none",
                  transition: "all 0.22s",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!isActive && href) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-gold-light)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = href ? "rgba(245,230,211,0.55)" : "rgba(245,230,211,0.25)";
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
            borderTop: "1px solid rgba(201,168,76,0.18)",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #7a6229)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-cinzel)", fontSize: "0.85rem",
              color: "var(--color-cream)",
              border: "1px solid rgba(201,168,76,0.25)",
              flexShrink: 0,
            }}
          >
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--color-cream)", fontFamily: "var(--font-cormorant)" }}>
              {user.name}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ fontSize: "0.75rem", color: "var(--color-gold-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-cormorant)", padding: 0, transition: "color 0.2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--color-gold)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--color-gold-dim)"; }}
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
