import Link from "next/link";
import Image from "next/image";

export function DashboardTopBar({
  selectedMonth,
  lang,
  currency,
  basePath = "/dashboard"
}: {
  selectedMonth: string;
  lang: string;
  currency: string;
  basePath?: string;
}) {
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const monthTabs = Array.from({ length: 12 }, (_, idx) => {
    const iso = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
    const href = `${basePath}?month=${iso}&lang=${lang}&currency=${currency}&preset=month`;
    return {
      iso,
      label: new Date(selectedYear, idx, 1).toLocaleDateString(lang, { month: "short" }).replace(/\.$/, ""),
      href,
      active: iso === selectedMonth
    };
  });

  return (
    <div className="app-top">
      <div className="app-brand">
        <Image src="/images/site-logo.png" alt="Planqly Assets" width={220} height={66} className="brand-logo-image" />
      </div>
      <div className="top-actions">
        <div className="top-months-shell">
          <span className="months-caption">{lang === "pt-PT" ? "Meses" : "Months"}</span>
          <div className="top-months" aria-label={lang === "pt-PT" ? "Selecionar mês" : "Select month"}>
            {monthTabs.map((m) => (
              <Link key={m.iso} className={`month-chip ${m.active ? "active" : ""}`} href={m.href}>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
