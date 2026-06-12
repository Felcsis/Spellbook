"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

function Particles() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 70; i++) {
      const el = document.createElement("div");
      const size = rand(1, 3);
      Object.assign(el.style, {
        position: "absolute", width: size + "px", height: size + "px",
        borderRadius: "50%", background: "#e8cc7a",
        left: rand(0, 100) + "vw", top: rand(0, 100) + "vh",
        animation: `twinkle ${rand(2, 6)}s ease-in-out ${rand(0, 6)}s infinite`,
      });
      container.appendChild(el);
    }
    const colors = ["rgba(201,168,76,0.7)", "rgba(167,139,250,0.7)", "rgba(232,180,200,0.7)"];
    for (let i = 0; i < 22; i++) {
      const el = document.createElement("div");
      const size = rand(3, 9);
      Object.assign(el.style, {
        position: "absolute", width: size + "px", height: size + "px",
        borderRadius: "50%", background: colors[Math.floor(Math.random() * colors.length)],
        left: rand(0, 100) + "vw", bottom: "-10px",
        animation: `drift ${rand(9, 20)}s linear ${rand(0, 12)}s infinite`,
      });
      container.appendChild(el);
    }
  }, []);
  return <div ref={ref} className="pointer-events-none fixed inset-0 z-0 overflow-hidden" />;
}

const USERS = [
  { name: "Felicia", email: "felicia@salon-spellbook.local", sigil: "✦", color: "#c9a84c" },
  { name: "Gitta",   email: "gitta@salon-spellbook.local",   sigil: "◈", color: "#a78bfa" },
  { name: "Lili",    email: "lili@salon-spellbook.local",    sigil: "♦", color: "#e8b4c8" },
] as const;

function UserCard({ name, email, sigil, color }: typeof USERS[number]) {
  const router = useRouter();
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

  const isGold   = color === "#c9a84c";
  const isPurple = color === "#a78bfa";

  const glowColor = isGold
    ? "rgba(201,168,76,0.35)"
    : isPurple
    ? "rgba(167,139,250,0.35)"
    : "rgba(232,180,200,0.35)";

  const glowAnim = isGold
    ? `0 0 20px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.1)`
    : isPurple
    ? `0 0 20px rgba(167,139,250,0.3), 0 0 60px rgba(167,139,250,0.1)`
    : `0 0 20px rgba(232,180,200,0.3), 0 0 60px rgba(232,180,200,0.1)`;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}44`,
        borderRadius: "24px",
        padding: "2.5rem 2rem",
        backdropFilter: "blur(24px) saturate(160%)",
        boxShadow: `0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), ${glowAnim}`,
        animation: "fadeInUp 0.75s cubic-bezier(0.16,1,0.3,1)",
        flex: "1 1 280px",
        maxWidth: 360,
        minWidth: 260,
      }}
    >
      {/* Sigil */}
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 64, height: 64,
            border: `1px solid ${color}66`,
            animation: "rotateSlow 22s linear infinite",
          }}
        >
          <span
            style={{
              fontSize: "1.8rem",
              color,
              animation: "rotateSlow 22s linear infinite reverse",
              filter: `drop-shadow(0 0 10px ${color}99)`,
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
            textShadow: `0 0 24px ${color}66`,
          }}
        >
          {name}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
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
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="· · · · · · · ·"
            required
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${color}33`,
              borderRadius: "10px",
              padding: "0.8rem 1rem",
              color: "var(--color-cream)",
              fontFamily: "var(--font-cormorant)",
              fontSize: "1.1rem",
              outline: "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
              width: "100%",
            }}
            onFocus={e => {
              e.target.style.borderColor = color;
              e.target.style.boxShadow = `0 0 0 3px ${color}22, 0 0 20px ${color}22`;
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
              background: "rgba(220,80,80,0.1)",
              border: "1px solid rgba(220,80,80,0.3)",
              color: "#f4a0a0",
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
          style={{
            padding: "0.88rem",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "var(--font-cinzel)",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#07040f",
            background: isGold
              ? "linear-gradient(120deg, #7a6229 0%, #c9a84c 30%, #e8cc7a 50%, #c9a84c 70%, #7a6229 100%)"
              : isPurple
              ? "linear-gradient(120deg, #4c1d95 0%, #7c3aed 30%, #a78bfa 50%, #7c3aed 70%, #4c1d95 100%)"
              : "linear-gradient(120deg, #9d4e6e 0%, #c47a99 30%, #e8b4c8 50%, #c47a99 70%, #9d4e6e 100%)",
            backgroundSize: "200% auto",
            boxShadow: `0 4px 20px ${glowColor}`,
            animation: "shimmer 3s linear infinite",
            opacity: loading ? 0.7 : 1,
            transition: "box-shadow 0.3s, transform 0.15s",
            width: "100%",
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 32px ${glowColor}`;
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${glowColor}`;
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
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[
          { w: 520, h: 520, top: -120, left: -120, c: "rgba(124,58,237,0.18)", d: "0s" },
          { w: 420, h: 420, bottom: -80, right: -80, c: "rgba(201,168,76,0.13)", d: "-5s" },
          { w: 360, h: 360, top: "40%", left: "55%", c: "rgba(232,180,200,0.1)", d: "-9s" },
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

      <Particles />

      <main
        className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-10 p-8"
        style={{ animation: "fadeIn 0.6s ease" }}
      >
        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              width: 72, height: 72,
              border: "1px solid rgba(201,168,76,0.4)",
              animation: "rotateSlow 22s linear infinite",
            }}
          >
            <span
              style={{
                fontSize: "2rem",
                color: "var(--color-gold)",
                display: "block",
                animation: "rotateSlow 22s linear infinite reverse",
                filter: "drop-shadow(0 0 12px rgba(201,168,76,0.6))",
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
              color: "var(--color-gold-light)",
              textShadow: "0 0 30px rgba(201,168,76,0.45)",
            }}
          >
            Salon Spellbook
          </h1>
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "var(--color-rose)",
              marginTop: "0.4rem",
              letterSpacing: "0.06em",
              opacity: 0.85,
            }}
          >
            Varázslatos szépség, minden napra
          </p>
        </div>

        {/* Three cards */}
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
