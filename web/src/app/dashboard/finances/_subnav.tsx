"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import PdfExportButton from "./_pdf-export";

const TABS = [
  { label: "Rögzítés",       href: "/dashboard/finances",       exact: true  },
  { label: "Napi",           href: "/dashboard/finances/napi",  exact: false },
  { label: "Heti",           href: "/dashboard/finances/heti",  exact: false },
  { label: "Havi",           href: "/dashboard/finances/havi",  exact: false },
  { label: "Éves",           href: "/dashboard/finances/eves",  exact: false },
];

export default function FinancesSubNav() {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: "0.3rem", flex: 1, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.3rem", flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
              style={{ flex: 1, minWidth: 70, padding: "0.55rem 0.75rem", borderRadius: 9, textDecoration: "none", textAlign: "center", fontFamily: "var(--font-cinzel)", fontSize: "0.56rem", letterSpacing: "0.1em", background: active ? "var(--bg-active)" : "transparent", color: active ? "var(--color-teal)" : "var(--text-muted)", transition: "all 0.2s" }}>
              {t.label}
            </Link>
          );
        })}
      </div>
      <PdfExportButton isAdmin={isAdmin} />
    </div>
  );
}
