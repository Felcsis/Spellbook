"use client";

import { useRouter } from "next/navigation";

const CARDS = [
  { icon: "✦", title: "Időpontok",            desc: "Foglalások kezelése",          href: null },
  { icon: "✂", title: "Szolgáltatások",        desc: "Kezelések és árak",            href: "/dashboard/services" },
  { icon: "♦", title: "Recept könyv",          desc: "Látogatási előzmények",        href: "/dashboard/guests" },
  { icon: "✧", title: "Pénzügyek",            desc: "Bevételek és kiadások",        href: "/dashboard/finances" },
  { icon: "◇", title: "Munkanaptár",          desc: "Ki mikor dolgozott",           href: "/dashboard/calendar" },
];

export default function DashboardClient({ name }: { name?: string | null }) {
  const router = useRouter();

  return (
    <div style={{ animation: "fadeInUp 0.5s ease" }}>
      <h1 style={{
        fontFamily: "var(--font-playfair)",
        fontSize: "2.1rem",
        color: "var(--color-teal)",
        marginBottom: "0.4rem",
        animation: "float 4s ease-in-out infinite",
      }}>
        Üdvözöllek, {name} ✦
      </h1>
      <p style={{
        fontStyle: "italic",
        color: "var(--color-pink)",
        opacity: 0.8,
        marginBottom: "2.5rem",
        fontFamily: "var(--font-cormorant)",
        fontSize: "1.05rem",
      }}>
        Mi legyen a mai varázslat?
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: "1.25rem",
      }}>
        {CARDS.map(({ icon, title, desc, href }) => (
          <button
            key={title}
            onClick={() => href && router.push(href)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(74,124,126,0.2)",
              borderRadius: "16px",
              padding: "1.75rem 1.5rem",
              textAlign: "left",
              cursor: href ? "pointer" : "default",
              backdropFilter: "blur(12px)",
              transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
              color: "inherit",
              opacity: href ? 1 : 0.4,
              boxShadow: "0 2px 12px var(--bg-today)",
            }}
            onMouseEnter={e => {
              if (!href) return;
              const el = e.currentTarget;
              el.style.borderColor = "rgba(74,124,126,0.42)";
              el.style.boxShadow = "0 8px 28px rgba(74,124,126,0.13)";
              el.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.borderColor = "rgba(74,124,126,0.2)";
              el.style.boxShadow = "0 2px 12px var(--bg-today)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem", color: "var(--color-teal)" }}>{icon}</div>
            <div style={{ fontFamily: "var(--font-cinzel)", fontSize: "0.75rem", letterSpacing: "0.16em", color: "var(--color-teal)", marginBottom: "0.35rem" }}>
              {title}
            </div>
            <div style={{ fontStyle: "italic", fontSize: "0.9rem", color: "var(--text-muted)", fontFamily: "var(--font-cormorant)" }}>
              {desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
