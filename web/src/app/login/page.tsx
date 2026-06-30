"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "~/app/_theme-toggle";
import { useIsMobile } from "~/app/_responsive";

const USERS = [
  { name: "Felicia", email: "felicia@salon-spellbook.local", sigil: "✦", color: "#c9906a", glowRgb: "201,144,106" },
  { name: "Gitta",   email: "gitta@salon-spellbook.local",   sigil: "◈", color: "#9878b8", glowRgb: "152,120,184" },
  { name: "Lili",    email: "lili@salon-spellbook.local",    sigil: "♦", color: "#e8a0b8", glowRgb: "232,160,184" },
] as const;

function UserCard({ name, email, sigil, color, glowRgb }: typeof USERS[number]) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Hibás jelszó.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${color}44`,
        borderRadius: "24px",
        padding: isMobile ? "1.75rem 1.25rem" : "2.5rem 2rem",
        backdropFilter: "blur(24px) saturate(160%)",
        boxShadow: `0 4px 32px rgba(${glowRgb},0.1), 0 1px 0 rgba(255,255,255,0.8) inset`,
        animation: "fadeInUp 0.75s cubic-bezier(0.16,1,0.3,1)",
        flex: isMobile ? "1 1 100%" : "1 1 280px",
        maxWidth: isMobile ? "100%" : 360,
        minWidth: isMobile ? 0 : 260,
      }}
    >
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 64, height: 64,
            border: `1px solid ${color}55`,
            animation: "rotateSlow 22s linear infinite",
          }}
        >
          <span
            style={{
              fontSize: "1.8rem",
              color,
              animation: "rotateSlow 22s linear infinite reverse",
              filter: `drop-shadow(0 0 8px ${color}88)`,
              display: "block",
            }}
          >
            {sigil}
          </span>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: "1.3rem",
            fontWeight: 600,
            letterSpacing: "0.16em",
            color,
          }}
        >
          {name}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Rejtett felhasználónév-mező — ettől ajánlja fel a böngésző a jelszó mentését,
            és három különböző fiókként tárolja Feliciát/Gittát/Lilit. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            border: 0,
          }}
        />
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`pw-${email}`}
            style={{
              fontFamily: "var(--font-cinzel)",
              fontSize: "0.6rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: `${color}aa`,
            }}
          >
            Jelszó
          </label>
          <input
            id={`pw-${email}`}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="· · · · · · · ·"
            required
            style={{
              background: "var(--bg-input)",
              border: `1px solid ${color}33`,
              borderRadius: "10px",
              padding: "0.8rem 1rem",
              color: "var(--text-primary)",
              fontFamily: "var(--font-cormorant)",
              fontSize: "1.1rem",
              outline: "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
              width: "100%",
            }}
            onFocus={e => {
              e.target.style.borderColor = color;
              e.target.style.boxShadow = `0 0 0 3px ${color}22`;
            }}
            onBlur={e => {
              e.target.style.borderColor = `${color}33`;
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {error && (
          <div
            style={{
              borderRadius: "8px",
              padding: "0.6rem 0.9rem",
              background: "var(--bg-highlight)",
              border: "1px solid var(--bg-highlight)",
              color: "#a03050",
              fontSize: "0.88rem",
              fontStyle: "italic",
              textAlign: "center",
              fontFamily: "var(--font-cormorant)",
              animation: "fadeInUp 0.3s ease",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-gold"
          style={{
            padding: "0.88rem",
            borderRadius: "10px",
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            width: "100%",
          }}
        >
          {loading ? "Belépés..." : "Belépés " + sigil}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      {/* Soft background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 520, h: 520, top: -120, left: -120,   c: "var(--bg-highlight)",  d: "0s" },
          { w: 420, h: 420, bottom: -80, right: -80,  c: "var(--bg-highlight)",  d: "-5s" },
          { w: 360, h: 360, top: "40%", left: "55%",  c: "var(--bg-highlight)",  d: "-9s" },
        ].map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: o.w, height: o.h,
              ...("top" in o && typeof o.top === "number" ? { top: o.top } : {}),
              ...("top" in o && typeof o.top === "string" ? { top: o.top } : {}),
              ...("bottom" in o ? { bottom: (o as { bottom: number }).bottom } : {}),
              ...("left" in o && typeof o.left === "number" ? { left: o.left } : {}),
              ...("left" in o && typeof o.left === "string" ? { left: o.left } : {}),
              ...("right" in o ? { right: (o as { right: number }).right } : {}),
              background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
              filter: "blur(80px)",
              animation: `orbFloat 14s ease-in-out ${o.d} infinite`,
            }}
          />
        ))}
      </div>

      {/* Theme toggle top right */}
      <div style={{ position: "fixed", top: "1.25rem", right: "1.5rem", zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <main
        className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-10 p-4 sm:p-8"
        style={{ animation: "fadeIn 0.6s ease" }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              width: 72, height: 72,
              border: "1px solid var(--border-strong)",
              animation: "rotateSlow 22s linear infinite",
            }}
          >
            <span
              style={{
                fontSize: "2rem",
                color: "var(--color-teal)",
                display: "block",
                animation: "rotateSlow 22s linear infinite reverse",
                filter: "drop-shadow(0 0 10px var(--border))",
              }}
            >
              ✦
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cinzel)",
              fontSize: "1.9rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "var(--color-teal)",
            }}
          >
            Salon Spellbook
          </h1>
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "var(--color-pink)",
              marginTop: "0.4rem",
              letterSpacing: "0.06em",
              opacity: 0.85,
            }}
          >
            Varázslatos szépség, minden napra
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: 1100,
          }}
        >
          {USERS.map(u => <UserCard key={u.email} {...u} />)}
        </div>
      </main>
    </>
  );
}
