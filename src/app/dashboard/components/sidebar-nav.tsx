import Link from "next/link";
import { LogoutButton } from "./logout-button";

type NavKey =
  | "dashboard"
  | "annual"
  | "movements"
  | "bills"
  | "budgets"
  | "goals"
  | "networth"
  | "activity"
  | "spreadsheet";

function Icon({ kind }: { kind: NavKey }) {
  if (kind === "dashboard") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.2" fill="currentColor" />
        <rect x="11" y="2" width="7" height="4" rx="1.2" fill="currentColor" />
        <rect x="11" y="8" width="7" height="10" rx="1.2" fill="currentColor" />
        <rect x="2" y="11" width="7" height="7" rx="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "movements") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 6h12v2H4zm0 6h12v2H4z" fill="currentColor" />
        <path d="M12 3l4 4-4 4V8H4V6h8zM8 17l-4-4 4-4v3h8v2H8z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "bills") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 8h8M6 11h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "annual") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 15h14v2H3z" fill="currentColor" />
        <path d="M5 13 8 9l3 2 4-5 2 1.5-5.2 6.5-3-2-2.4 3z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "budgets") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 5h14v10H3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 9h14" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14" cy="12.5" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "goals") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "networth") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 14.5 7 10l3 2.5L15.5 7l1.5 1.5-7 7-3-2.5-2.5 2z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "activity") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2.5 10h3L7 6l3 8 2-4h5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2" y="3" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.6" />
      <line x1="7" y1="8" x2="7" y2="17" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="8" x2="12" y2="17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function DashboardSidebar({
  current,
  selectedMonth,
  lang,
  currency,
  showBottomControls = true,
  userInitials,
  logoutLabel
}: {
  current: NavKey;
  selectedMonth: string;
  lang: string;
  currency: string;
  showBottomControls?: boolean;
  userInitials?: string;
  logoutLabel?: string;
}) {
  const isPt = lang === "pt-PT";
  const q = `month=${selectedMonth}&lang=${lang}&currency=${currency}`;
  const monthQ = `month=${selectedMonth}`;
  const langOptions = [
    { value: "pt-PT", label: "PT" },
    { value: "en-US", label: "EN" },
    { value: "es-ES", label: "ES" },
    { value: "fr-FR", label: "FR" }
  ];
  const currencyOptions = ["EUR", "USD", "GBP", "BRL"];
  const items: Array<{ key: NavKey; label: string; href: string }> = [
    { key: "dashboard", label: isPt ? "Dashboard" : "Dashboard", href: `/dashboard?${q}` },
    { key: "annual", label: isPt ? "Resumo anual" : "Annual Overview", href: `/dashboard/anual?${q}` },
    { key: "movements", label: isPt ? "Movimentos" : "Movements", href: `/dashboard/movimentos?${q}` },
    { key: "bills", label: isPt ? "Contas" : "Bills", href: `/dashboard/bills?${q}` },
    { key: "budgets", label: isPt ? "Orçamentos" : "Budgets", href: `/dashboard/orcamentos?${q}` },
    { key: "goals", label: isPt ? "Objetivos" : "Goals", href: `/dashboard/objetivos?${q}` },
    { key: "networth", label: isPt ? "Património" : "Net Worth", href: `/dashboard/patrimonio?${q}` },
    { key: "activity", label: isPt ? "Atividade" : "Activity", href: `/dashboard/activity?${q}` },
    { key: "spreadsheet", label: "Spreadsheet", href: `/dashboard/spreadsheet?${q}` }
  ];


  return (
    <aside className="side-nav">
      <div className="side-nav-label">{isPt ? "MENU" : "MENU"}</div>
      <nav className="side-nav-items">
        {items.map((item) => (
          <Link key={item.key} className={`side-nav-item ${item.key === current ? "active" : ""}`} href={item.href}>
            <span className={`side-nav-icon side-nav-icon-${item.key}`}>
              <Icon kind={item.key} />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {showBottomControls ? (
        <div className="side-nav-bottom">
          <div className="side-account-title">{isPt ? "Conta" : "Account"}</div>

          <div className="side-account-row">
            <span className="side-account-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="3" fill="currentColor" />
                <path d="M3.5 17a6.5 6.5 0 0 1 13 0z" fill="currentColor" />
              </svg>
            </span>
            <span className="side-account-label">{isPt ? "Idioma" : "Language"}</span>
            <div className="side-inline-options">
              {langOptions.map((opt) => (
                <Link
                  key={opt.value}
                  className={`side-inline-link ${lang === opt.value ? "active" : ""}`}
                  href={`?${monthQ}&lang=${opt.value}&currency=${currency}`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="side-account-row">
            <span className="side-account-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M10 5.5v9M6.5 8.2c0-1.2 1.1-2 3.5-2s3.5.8 3.5 2-1 1.8-3.5 2-3.5.9-3.5 2.1 1 2 3.5 2 3.5-.8 3.5-2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="side-account-label">{isPt ? "Moeda" : "Currency"}</span>
            <div className="side-inline-options">
              {currencyOptions.map((opt) => (
                <Link
                  key={opt}
                  className={`side-inline-link ${currency === opt ? "active" : ""}`}
                  href={`?${monthQ}&lang=${lang}&currency=${opt}`}
                >
                  {opt}
                </Link>
              ))}
            </div>
          </div>

          <div className="side-account-row">
            <span className="side-account-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M10 3v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6.3 5.4A6 6 0 1 0 13.7 5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div className="side-nav-user-row">
              <div className="avatar-mini side-avatar">{userInitials || "U"}</div>
              <LogoutButton className="logout-light side-logout side-logout-link" label={logoutLabel || (isPt ? "Terminar sessão" : "Logout")} />
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
