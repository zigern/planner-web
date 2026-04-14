import Link from "next/link";

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
      label: new Date(selectedYear, idx, 1).toLocaleDateString(lang, { month: "short" }),
      href,
      active: iso === selectedMonth
    };
  });

  return (
    <div className="app-top">
      <div className="app-brand">
        <div className="logo-box">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor" />
          </svg>
        </div>
        <span>Casha</span>
      </div>
      <div className="top-actions">
        <div className="top-months" aria-label={lang === "pt-PT" ? "Selecionar mês" : "Select month"}>
          {monthTabs.map((m) => (
            <Link key={m.iso} className={`month-chip ${m.active ? "active" : ""}`} href={m.href}>
              {m.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
