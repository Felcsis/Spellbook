import { formatWhen } from "~/lib/date";
import Link from "next/link";
import { confirmBooking } from "~/server/booking-public";

/**
 * A vendég megerősíti az e-mail címét, és ezzel a kérése a szalon elé kerül.
 *
 * Ez egyben a bot-védelem gerince: megerősítés nélkül a kérés nem foglal helyet
 * és nem ér el senkit, tehát egy kitalált címmel beküldött foglalás magától
 * elenyészik.
 */

export const dynamic = "force-dynamic";

const shell: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  padding: "2rem", background: "var(--color-bg)",
};

const card: React.CSSProperties = {
  maxWidth: 460, width: "100%", padding: "2rem",
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18,
  boxShadow: "var(--shadow-card)", fontFamily: "var(--font-cormorant)",
  color: "var(--text-primary)", textAlign: "center",
};

const title: React.CSSProperties = {
  fontFamily: "var(--font-playfair)", fontSize: "1.5rem",
  color: "var(--color-teal)", margin: "0 0 0.75rem", fontWeight: 400,
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await confirmBooking(token);

  if (!result.ok) {
    const text =
      result.reason === "nincs"    ? "Ezt a kérést nem találjuk. Lehet, hogy a link hibás vagy elavult."
    : result.reason === "lejart"   ? "Ez az időpont már elmúlt."
    :                                "Ezt a kérést időközben visszavonták.";
    return (
      <div style={shell}>
        <div style={card}>
          <h1 style={title}>Nem sikerült megerősíteni</h1>
          <p style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>{text}</p>
          <p style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>
            Hívj minket, és megbeszéljük: <strong>+36 30 089 4587</strong>
          </p>
        </div>
      </div>
    );
  }

  const when = formatWhen(result.booking.startsAt);

  return (
    <div style={shell}>
      <div style={card}>
        <h1 style={title}>
          {result.alreadyDone ? "Ezt már megerősítetted" : "Köszönjük, megerősítetted!"}
        </h1>

        <p style={{ color: "var(--text-soft)", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
          A kérésed eljutott hozzánk. <strong>Ez még nem végleges időpont</strong> —
          megnézzük, és visszajelzünk e-mailben.
        </p>

        <div style={{
          textAlign: "left", padding: "0.9rem 1.1rem", borderRadius: 12,
          background: "var(--bg-panel)", border: "1px solid var(--border)", marginBottom: "1.25rem",
        }}>
          <Row label="Mikor" value={when} />
          <Row label="Mit"   value={result.booking.service} />
          <Row label="Kihez" value={result.booking.workerName} />
        </div>

        <Link href="https://colormecrazy.hu" style={{
          display: "inline-block", padding: "0.7rem 1.4rem", borderRadius: 9,
          background: "#5a8a72", color: "#fff", textDecoration: "none",
          fontFamily: "var(--font-cinzel)", fontSize: "0.6rem", letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Vissza a weboldalra
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.25rem 0" }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}
