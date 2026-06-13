"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NAV = [
  { key: "dashboard",    icon: "◈", label: "Főoldal",         href: "/dashboard" },
  { key: "appointments", icon: "✦", label: "Időpontok",       href: null },
  { key: "services",     icon: "✂", label: "Szolgáltatások",  href: "/dashboard/services" },
  { key: "clients",      icon: "♦", label: "Vendégek",        href: null },
  { key: "finances",     icon: "✧", label: "Pénzügyek",       href: "/dashboard/finances" },
  { key: "calendar",     icon: "◇", label: "Munkanaptár",    href: "/dashboard/calendar" },
] as const;

const CARDS = [
  { icon: "✂", title: "Időpontok",      desc: "Foglalások kezelése",      key: "appointments" },
  { icon: "✦", title: "Szolgáltatások", desc: "Kezelések és árak",         key: "services" },
  { icon: "♦", title: "Vendégek",       desc: "Törzsvendég kártyák",       key: "clients" },
  { icon: "✧", title: "Pénzügyek",      desc: "Bevételek és kiadások",     key: "finances" },
  { icon: "◇", title: "Munkanaptár",   desc: "Ki mikor dolgozott",         key: "calendar" },
] as const;

function initials(name?: string | null) {
  return (name ?? "?")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type NavKey = (typeof NAV)[number]["key"];

export default function DashboardClient({ user }: { user: { name?: string | null; email?: string | null } }) {
  const [active, setActive] = useState<NavKey>("dashboard");
  const router = useRouter();

  return (
    <div className="flex min-h-screen" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 500, h: 500, top: -100, left: -100, color: "rgba(124,58,237,0.15)", delay: "0s" },
          { w: 400, h: 400, bottom: -80, right: -80, color: "rgba(201,168,76,0.1)", delay: "-5s" },
          { w: 340, h: 340, top: "40%", left: "55%", color: "rgba(232,180,200,0.08)", delay: "-9s" },
        ].map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: o.w, height: o.h,
              ...(o.top !== undefined ? { top: o.top } : {}),
              ...(("bottom" in o) ? { bottom: (o as { bottom: number }).bottom } : {}),
              ...(o.left !== undefined ? { left: o.left } : {}),
              ...(("right" in o) ? { right: (o as { right: number }).right } : {}),
              background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
              filter: "blur(80px)",
              animation: `orbFloat 14s ease-in-out ${o.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <nav
        className="relative z-10 flex flex-col"
        style={{
          width: 260,
          background: "rgba(10,6,20,0.85)",
          borderRight: "1px solid rgba(201,168,76,0.2)",
          backdropFilter: "blur(20px)",
          padding: "2rem 1.25rem",
          flexShrink: 0,
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
          }}
        >
          ✦ Salon Spellbook
        </div>

        <div className="flex flex-col gap-1">
          {NAV.map(({ key, icon, label, href }) => (
            <button
              key={key}
              onClick={() => { if (href) router.push(href); else setActive(key); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.7rem 1rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: "var(--font-cormorant)",
                fontSize: "1rem",
                letterSpacing: "0.04em",
                border: active === key
                  ? "1px solid rgba(201,168,76,0.3)"
                  : "1px solid transparent",
                background: active === key
                  ? "rgba(201,168,76,0.1)"
                  : "transparent",
                color: active === key
                  ? "var(--color-gold)"
                  : "rgba(245,230,211,0.55)",
                boxShadow: active === key
                  ? "0 0 16px rgba(201,168,76,0.1)"
                  : "none",
                transition: "all 0.22s",
                textAlign: "left",
              }}
              onMouseEnter={e => {
                if (active !== key) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-gold-light)";
                }
              }}
              onMouseLeave={e => {
                if (active !== key) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "rgba(245,230,211,0.55)";
                }
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* User block */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.9rem 1rem",
            borderTop: "1px solid rgba(201,168,76,0.18)",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: 40, height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #7a6229)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-cinzel)",
              fontSize: "0.85rem",
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
              style={{
                fontSize: "0.75rem",
                color: "var(--color-gold-dim)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-cormorant)",
                padding: 0,
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--color-gold)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--color-gold-dim)"; }}
            >
              Kilépés
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto p-12">
        {active === "dashboard" && (
          <div style={{ animation: "fadeInUp 0.5s ease" }}>
            <h1
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "2.1rem",
                color: "var(--color-gold-light)",
                textShadow: "0 0 24px rgba(201,168,76,0.3)",
                marginBottom: "0.4rem",
                animation: "float 4s ease-in-out infinite",
              }}
            >
              Üdvözöllek, {user.name} ✦
            </h1>
            <p
              style={{
                fontStyle: "italic",
                color: "var(--color-rose)",
                opacity: 0.75,
                marginBottom: "2.5rem",
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.05rem",
              }}
            >
              Mi legyen a mai varázslat?
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {CARDS.map(({ icon, title, desc, key }) => (
                <button
                  key={key}
                  onClick={() => (key === "finances" || key === "calendar" || key === "services") ? router.push(`/dashboard/${key}`) : setActive(key as NavKey)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(201,168,76,0.22)",
                    borderRadius: "16px",
                    padding: "1.75rem 1.5rem",
                    textAlign: "left",
                    cursor: "pointer",
                    backdropFilter: "blur(16px)",
                    transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
                    color: "inherit",
                    animation: "fadeInUp 0.5s ease",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = "rgba(201,168,76,0.45)";
                    el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(201,168,76,0.12)";
                    el.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = "rgba(201,168,76,0.22)";
                    el.style.boxShadow = "none";
                    el.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem", color: "var(--color-gold)" }}>
                    {icon}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.16em",
                      color: "var(--color-gold-light)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontStyle: "italic",
                      fontSize: "0.9rem",
                      color: "rgba(245,230,211,0.5)",
                      fontFamily: "var(--font-cormorant)",
                    }}
                  >
                    {desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {active !== "dashboard" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            <h1
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "2rem",
                color: "var(--color-gold-light)",
                marginBottom: "0.5rem",
                animation: "float 4s ease-in-out infinite",
              }}
            >
              {NAV.find(n => n.key === active)?.label} ✦
            </h1>
            <p
              style={{
                fontStyle: "italic",
                color: "var(--color-rose)",
                opacity: 0.7,
                fontFamily: "var(--font-cormorant)",
              }}
            >
              Ez az oldal hamarosan elkészül...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
