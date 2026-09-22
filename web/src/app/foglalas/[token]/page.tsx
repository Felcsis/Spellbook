import { formatWhen } from "~/lib/date";
import { bookingByToken } from "~/server/booking-public";
import { CancelBox } from "./_cancel";

/**
 * A vendég saját oldala: itt látja az időpontját, és itt tudja lemondani.
 *
 * A link a visszaigazoló levélben van. Jelszó nincs: a token kitalálhatatlan,
 * egy lemondást pedig senkinek nem éri meg meghamisítani — a regisztráció
 * kényszere viszont sokakat elriasztana.
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

const LABEL: Record<string, string> = {
  megerosites_varo: "Még nem erősítetted meg — nézd meg a leveled.",
  kert:             "Megkaptuk. Hamarosan visszajelzünk, hogy szabad-e.",
  elfogadva:        "Visszaigazolt időpont — várunk szeretettel!",
  elutasitva:       "Ezt az időpontot sajnos nem tudtuk vállalni.",
  lemondva:         "Ezt az időpontot lemondták.",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await bookingByToken(token);

  if (!b) {
    return (
      <div style={shell}>
        <div style={card}>
          <h1 style={title}>Nem találjuk ezt az időpontot</h1>
          <p style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>
            Lehet, hogy a link hibás. Hívj minket: <strong>+36 30 089 4587</strong>
          </p>
        </div>
      </div>
    );
  }

  const when = formatWhen(b.startsAt);
  const cancellable = b.startsAt > new Date()
    && b.status !== "lemondva" && b.status !== "elutasitva";

  return (
    <div style={shell}>
      <div style={card}>
        <h1 style={title}>Az időpontod</h1>
        <p style={{ color: "var(--text-soft)", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
          {LABEL[b.status] ?? ""}
        </p>

        <div style={{
          textAlign: "left", padding: "0.9rem 1.1rem", borderRadius: 12,
          background: "var(--bg-panel)", border: "1px solid var(--border)", marginBottom: "1.25rem",
        }}>
          <Row label="Mikor" value={when} />
          <Row label="Mit"   value={b.service} />
          <Row label="Kihez" value={b.worker.name ?? ""} />

          {b.pair && (
            <>
              <div style={{
                margin: "0.7rem 0 0.2rem", fontSize: "0.8rem",
                color: "var(--text-dim)", fontStyle: "italic",
              }}>
                És mindjárt utána:
              </div>
              <Row label="Mikor" value={formatWhen(b.pair.startsAt)} />
              <Row label="Mit"   value={b.pair.service} />
              <Row label="Kihez" value={b.pair.worker.name ?? ""} />
            </>
          )}
        </div>

        {b.pair && cancellable && (
          <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", margin: "0 0 0.6rem", lineHeight: 1.6 }}>
            A lemondás <strong>mindkét időpontra</strong> vonatkozik — egy látogatásként kérted őket.
          </p>
        )}

        {cancellable && <CancelBox token={token} />}

        <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "1.25rem", lineHeight: 1.6 }}>
          Color Me Crazy · Nemes Takács utca 8, Szeged
        </p>
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
