import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export interface ParsedService {
  name: string;
  price: number;
  duration: number;
}

export interface ParsedCategory {
  name: string;
  services: ParsedService[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cleanPrice(raw: string): number | null {
  // Remove spaces, dots used as thousands separators, "Ft", ",-", "HUF"
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/Ft|HUF|,-/gi, "")
    .replace(/\.(?=\d{3})/g, "")   // 5.000 → 5000
    .replace(/,(?=\d{3})/g, "")    // 5,000 → 5000
    .replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) || n <= 0 || n > 500_000 ? null : n;
}

function looksLikeCategory(line: string): boolean {
  const trimmed = line.trim();
  // Category: short line, all caps or ends with ":", no price, at least 3 chars
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  const hasPrice = /\d{3,}/.test(trimmed);
  if (hasPrice) return false;
  const allCaps = trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÖŐÚÜŰ]/.test(trimmed);
  const endsColon = trimmed.endsWith(":");
  const titleCase = /^[A-ZÁÉÍÓÖŐÚÜŰ]/.test(trimmed) && trimmed.split(" ").length <= 5;
  return allCaps || endsColon || titleCase;
}

function parsePdfText(text: string): ParsedCategory[] {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const categories: ParsedCategory[] = [];
  let currentCategory: ParsedCategory = { name: "Általános", services: [] };

  // Pattern: anything followed by a price (3-6 digits, possibly formatted)
  const pricePattern = /^(.+?)\s*[.\s\-–]{0,10}\s*(\d[\d\s.,]{1,8}\d)\s*(Ft|HUF|,-)?$/i;

  for (const line of lines) {
    // Skip obviously useless lines
    if (line.length < 3) continue;
    if (/^(Árlista|Price list|Tel:|Web:|www\.|http|©|\d{4}\s*\.|oldal|page)/i.test(line)) continue;

    const match = pricePattern.exec(line);
    if (match) {
      const rawName = (match[1] ?? "").trim().replace(/[:.]+$/, "").trim();
      const rawPrice = match[2] ?? "";
      const price = cleanPrice(rawPrice);

      if (price && rawName.length >= 2 && rawName.length <= 80) {
        currentCategory.services.push({ name: rawName, price, duration: 30 });
      }
    } else if (looksLikeCategory(line)) {
      // Save current category if it has services
      if (currentCategory.services.length > 0) {
        categories.push(currentCategory);
      }
      currentCategory = {
        name: line.replace(/:$/, "").trim(),
        services: [],
      };
    }
  }

  // Push last category
  if (currentCategory.services.length > 0) {
    categories.push(currentCategory);
  }

  return categories;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("pdf");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nem érkezett fájl." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "A PDF nem tartalmaz olvasható szöveget (pl. szkennelt kép)." }, { status: 422 });
    }

    const categories = parsePdfText(text);

    if (categories.length === 0 || categories.every(c => c.services.length === 0)) {
      return NextResponse.json({ error: "Nem sikerült szolgáltatásokat azonosítani. Ellenőrizd, hogy a PDF szöveges árlistát tartalmaz-e." }, { status: 422 });
    }

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json({ error: "Hiba a PDF feldolgozása során." }, { status: 500 });
  }
}
