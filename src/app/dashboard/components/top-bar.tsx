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
  const selectedMonthNumber = Number(selectedMonth.slice(5, 7));
  const previousYearMonth = `${selectedYear - 1}-${String(selectedMonthNumber).padStart(2, "0")}`;
  const nextYearMonth = `${selectedYear + 1}-${String(selectedMonthNumber).padStart(2, "0")}`;
  const previousYearHref = `${basePath}?month=${previousYearMonth}&lang=${lang}&currency=${currency}&preset=month`;
  const nextYearHref = `${basePath}?month=${nextYearMonth}&lang=${lang}&currency=${currency}&preset=month`;
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
        <div className="logo-box">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor" />
          </svg>
        </div>
        <span>Casha</span>
      </div>
      <div className="top-actions">
        <div className="top-year-nav" aria-label={lang === "pt-PT" ? "Selecionar ano" : "Select year"}>
          <Link className="year-btn" href={previousYearHref} aria-label={lang === "pt-PT" ? "Ano anterior" : "Previous year"}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="year-value">{selectedYear}</span>
          <Link className="year-btn" href={nextYearHref} aria-label={lang === "pt-PT" ? "Ano seguinte" : "Next year"}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
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
