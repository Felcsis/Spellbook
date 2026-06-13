"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const USERS = [
  { name: "Felicia", email: "felicia@salon-spellbook.local", sigil: "✦", color: "#4a7c7e", glowRgb: "74,124,126" },
  { name: "Gitta",   email: "gitta@salon-spellbook.local",   sigil: "◈", color: "#c45c7a", glowRgb: "196,92,122" },
  { name: "Lili",    email: "lili@salon-spellbook.local",    sigil: "♦", color: "#7a8c5a", glowRgb: "122,140,90" },
] as const;

function UserCard({ name, email, sigil, color, glowRgb }: typeof USERS[number]) {
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

  return (
    <div
      style={{
        background: "rgba(220,210,195,0.85)",
        border: `1px solid ${color}44`,
        borderRadius: "24px",
        padding: "2.5rem 2rem",
        backdropFilter: "blur(24px) saturate(160%)",
        boxShadow: `0 4px 32px rgba(${glowRgb},0.1), 0 1px 0 rgba(255,255,255,0.8) inset`,
        animation: "fadeInUp 0.75s cubic-bezier(0.16,1,0.3,1)",
        flex: "1 1 280px",
        maxWidth: 360,
        minWidth: 260,
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
              background: "rgba(215,205,190,0.55)",
              border: `1px solid ${color}33`,
              borderRadius: "10px",
              padding: "0.8rem 1rem",
              color: "#2c2420",
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
              background: "rgba(196,92,122,0.08)",
              border: "1px solid rgba(196,92,122,0.3)",
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
            color: "#fff",
            background: `linear-gradient(120deg, ${color}cc 0%, ${color} 50%, ${color}cc 100%)`,
            backgroundSize: "200% auto",
            boxShadow: `0 4px 20px rgba(${glowRgb},0.3)`,
            animation: "shimmer 3s linear infinite",
            opacity: loading ? 0.7 : 1,
            transition: "box-shadow 0.3s, transform 0.15s",
            width: "100%",
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 32px rgba(${glowRgb},0.4)`;
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(${glowRgb},0.3)`;
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
          { w: 520, h: 520, top: -120, left: -120, c: "rgba(196,92,122,0.08)", d: "0s" },
          { w: 420, h: 420, bottom: -80, right: -80, c: "rgba(74,124,126,0.08)", d: "-5s" },
          { w: 360, h: 360, top: "40%", left: "55%", c: "rgba(122,140,90,0.07)", d: "-9s" },
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

      <main
        className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-10 p-8"
        style={{ animation: "fadeIn 0.6s ease" }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              width: 72, height: 72,
              border: "1px solid rgba(74,124,126,0.35)",
              animation: "rotateSlow 22s linear infinite",
            }}
          >
            <span
              style={{
                fontSize: "2rem",
                color: "#4a7c7e",
                display: "block",
                animation: "rotateSlow 22s linear infinite reverse",
                filter: "drop-shadow(0 0 10px rgba(74,124,126,0.5))",
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
              color: "#4a7c7e",
            }}
          >
            Salon Spellbook
          </h1>
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "#c45c7a",
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
