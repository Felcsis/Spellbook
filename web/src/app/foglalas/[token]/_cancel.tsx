"use client";

import { useState } from "react";

/**
 * Lemondás a vendég saját oldaláról.
 *
 * Két lépésben: a gomb megkérdezi, biztos-e. Egy véletlen kattintás különben
 * visszavonhatatlanul elvenné az időpontját.
 */
export function CancelBox({ token }: { token: string }) {
  const [asking, setAsking] = useState(false);
  const [state, setState]   = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg]       = useState("");

  async function cancel() {
    setState("sending");
    try {
      const res  = await fetch(`/api/foglalas/${token}/lemondas`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) { setState("done"); return; }
      setMsg(data.error ?? "Nem sikerült lemondani.");
      setState("error");
    } catch {
      setMsg("Nem sikerült elérni a szalont. Kérünk, hívj minket.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div style={{
        padding: "0.75rem 1rem", borderRadius: 10,
        background: "rgba(82,118,102,0.1)", border: "1px solid rgba(82,118,102,0.4)",
        color: "#527666", lineHeight: 1.6,
      }}>
        Lemondtuk az időpontodat. Köszönjük, hogy szóltál!
      </div>
    );
  }

  return (
    <div>
      {!asking ? (
        <button onClick={() => setAsking(true)} style={ghost}>
          Nem tudok menni, lemondom
        </button>
      ) : (
        <div>
          <p style={{ color: "var(--text-soft)", margin: "0 0 0.6rem" }}>
            Biztosan lemondod ezt az időpontot?
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button onClick={cancel} disabled={state === "sending"} style={danger}>
              {state === "sending" ? "Lemondás…" : "Igen, lemondom"}
            </button>
            <button onClick={() => setAsking(false)} style={ghost}>Mégsem</button>
          </div>
        </div>
      )}

      {state === "error" && (
        <p style={{ marginTop: "0.6rem", color: "#c47878" }}>{msg}</p>
      )}
    </div>
  );
}

const ghost: React.CSSProperties = {
  padding: "0.55rem 1.1rem", borderRadius: 9, cursor: "pointer",
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--text-soft)", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
};

const danger: React.CSSProperties = {
  padding: "0.55rem 1.1rem", borderRadius: 9, cursor: "pointer",
  border: "1px solid #c47878", background: "rgba(196,120,120,0.12)",
  color: "#c47878", fontFamily: "var(--font-cormorant)", fontSize: "1rem",
};
