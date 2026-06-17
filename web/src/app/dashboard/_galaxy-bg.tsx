"use client";

/* Performant galaxy background — 7 DOM elements total, GPU-only animations */
export function GalaxyBg() {
  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", overflow: "hidden",
      background: "linear-gradient(135deg, #090414 0%, #0c0818 45%, #07030f 75%, #0d0620 100%)",
    }}>

      {/* ── Ködfoltok — 4 db, csak opacity+transform animáció (GPU) ── */}
      <div style={{ position: "absolute", left: "15%", top: "25%", width: "50vw", height: "40vh",
        background: "radial-gradient(ellipse, rgba(100,40,200,0.32) 0%, transparent 70%)",
        filter: "blur(80px)", animation: "nebulaFloat 20s ease-in-out infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", left: "60%", top: "50%", width: "45vw", height: "38vh",
        background: "radial-gradient(ellipse, rgba(30,70,200,0.28) 0%, transparent 70%)",
        filter: "blur(75px)", animation: "nebulaFloat 25s ease-in-out -8s infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", left: "40%", top: "5%", width: "38vw", height: "32vh",
        background: "radial-gradient(ellipse, rgba(180,40,120,0.22) 0%, transparent 70%)",
        filter: "blur(70px)", animation: "nebulaFloat 18s ease-in-out -4s infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", left: "5%", top: "65%", width: "40vw", height: "35vh",
        background: "radial-gradient(ellipse, rgba(20,80,160,0.24) 0%, transparent 70%)",
        filter: "blur(85px)", animation: "nebulaFloat 22s ease-in-out -12s infinite", willChange: "transform" }} />

      {/* ── Csillag-réteg 1 — fehér csillagok, 3s twinkle ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: [
          "radial-gradient(1.5px 1.5px at  5%  8%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 12% 22%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 19%  5%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 27% 45%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 34% 68%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 41% 30%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 50% 85%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 58% 12%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 66% 55%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 73% 38%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 80% 72%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 88% 18%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 95% 60%, #fff 0%, transparent 100%)",
        ].join(", "),
        animation: "layerTwinkle 3.5s ease-in-out infinite",
        willChange: "opacity",
      }} />

      {/* ── Csillag-réteg 2 — fehér csillagok, 5s twinkle (eltolt fázis) ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: [
          "radial-gradient(1px   1px   at  8% 50%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 16% 80%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 23% 15%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 31% 92%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 39% 58%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 47% 28%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 55% 75%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 63% 42%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 71% 90%, #fff 0%, transparent 100%)",
          "radial-gradient(1.5px 1.5px at 79% 22%, #fff 0%, transparent 100%)",
          "radial-gradient(1px   1px   at 86% 65%, #fff 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 93% 35%, #fff 0%, transparent 100%)",
        ].join(", "),
        animation: "layerTwinkle 5s ease-in-out -2s infinite",
        willChange: "opacity",
      }} />

      {/* ── Csillag-réteg 3 — arany + lila csillagok, 7s twinkle ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: [
          "radial-gradient(2.5px 2.5px at 18% 35%, rgba(200,168,64,0.9) 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 38% 20%, rgba(180,110,240,0.85) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 55% 78%, rgba(200,168,64,0.88) 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 72% 48%, rgba(180,110,240,0.80) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 84% 15%, rgba(255,160,200,0.85) 0%, transparent 100%)",
          "radial-gradient(2px   2px   at 43% 65%, rgba(255,160,200,0.80) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 92% 52%, rgba(200,168,64,0.88) 0%, transparent 100%)",
        ].join(", "),
        animation: "layerTwinkle 7s ease-in-out -3.5s infinite",
        willChange: "opacity",
      }} />
    </div>
  );
}
