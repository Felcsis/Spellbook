/**
 * Szabad időpontok a NYILVÁNOS foglalóhoz.
 *
 * Tiszta számítás, adatbázis és hálózat nélkül — ezért külön tesztelhető.
 *
 * Nem ugyanaz, mint a belső `free-slots.ts`: az a teljes munkaidőt nézi, mert
 * bent ti bármikor beírhattok egy vendéget. Kifelé viszont csak annyit adunk ki,
 * amennyit a szalon kijelölt (`BookableWindow`) — a többi marad beugró vendégnek.
 *
 * Amit a válasz SOHA nem tartalmazhat: kinek van ott időpontja, milyen
 * szolgáltatásra, miért foglalt. Csak annyit, hogy egy sáv szabad-e. A foglalt
 * sávokból különben kiolvasható lenne, ki mikor jár a szalonba.
 */

export type Window = { startMin: number; endMin: number };
export type Busy   = { startMin: number; endMin: number };

export type SlotOptions = {
  /** A szolgáltatás hossza percben. */
  minutes: number;
  /** Milyen sűrűn ajánljunk kezdést. */
  step?: number;
  /** Takarítás/ráhagyás a vendégek között. */
  buffer?: number;
};

/**
 * Egy nap szabad kezdési időpontjai percben, éjféltől számolva.
 *
 * A `windows` a kiadott sávok, a `busy` minden, ami már elkel: elfogadott
 * foglalás, a Spellbookban rögzített előjegyzés, a dolgozó Google-eseményei,
 * és a még el nem bírált kérések is — utóbbi azért, hogy ne jelentkezhessen
 * hárman ugyanarra, amíg a szalon dönt.
 */
export function daySlots(windows: Window[], busy: Busy[], opts: SlotOptions): number[] {
  const step    = opts.step ?? 15;
  const buffer  = opts.buffer ?? 0;
  const needed  = opts.minutes + buffer;
  if (needed <= 0 || !windows.length) return [];

  const blocks = [...busy].sort((a, b) => a.startMin - b.startMin);
  const out: number[] = [];

  for (const w of windows) {
    let cursor = roundUp(w.startMin, step);

    while (cursor + opts.minutes <= w.endMin) {
      const end   = cursor + needed;
      const clash = blocks.find(b => b.startMin < end && b.endMin > cursor);

      if (clash) {
        cursor = roundUp(clash.endMin, step);
        continue;
      }
      out.push(cursor);
      cursor += step;
    }
  }

  // Ha a kiadott sávok átfednek, ugyanaz a kezdés kétszer is előállhatna.
  return [...new Set(out)].sort((a, b) => a - b);
}

function roundUp(v: number, step: number): number {
  return Math.ceil(v / step) * step;
}

/** "HH:MM" → perc éjféltől. Érvénytelen bemenetnél NaN. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Perc → "HH:MM". */
export function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
