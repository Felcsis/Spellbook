/**
 * Szolgáltatásnév + kategória a választókban.
 *
 * Több tétel ugyanazon a néven fut különböző kategóriában ("Rövid" a női és a
 * férfi hajvágásnál és a festésnél is), és a választóban csak a név látszott.
 * Így került női vendégek kártyájára a férfi "Rövid" — utólag sem tűnt fel,
 * mert a kiválasztott tételen sem volt ott a kategória.
 */

/** "Festés / színezés (+felhasznált anyag)" → "Festés / színezés". */
export function catShort(cat: string | null | undefined): string {
  return (cat ?? "").replace(/\s*\(.*\)\s*/g, "").trim();
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Szavanként keres a névben és a kategóriában együtt, ékezet nélkül is:
 * "ferfi rovid" csak a férfi Rövidet adja, "női" az összes női tételt.
 */
export function serviceMatches(query: string, name: string, cat: string | null | undefined): boolean {
  const hay = fold(`${cat ?? ""} ${name}`);
  return fold(query).split(/\s+/).filter(Boolean).every(t => hay.includes(t));
}
