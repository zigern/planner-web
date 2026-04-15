"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SidebarSettings({
  lang,
  currency,
  isPt,
  userInitials = "U",
  logoutLabel
}: {
  lang: string;
  currency: string;
  isPt: boolean;
  userInitials?: string;
  logoutLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [initials, setInitials] = useState(userInitials);
  const [saved, setSaved] = useState<string | null>(null);
  const [loadingLogout, setLoadingLogout] = useState(false);

  useEffect(() => {
    try {
      const name = localStorage.getItem("planner_display_name") || "";
      const localInitials = localStorage.getItem("planner_avatar_initials") || userInitials;
      setDisplayName(name);
      setInitials(localInitials.toUpperCase().slice(0, 2));
    } catch {
      setDisplayName("");
      setInitials(userInitials);
    }
  }, [userInitials]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(search.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onSaveAccount() {
    try {
      localStorage.setItem("planner_display_name", displayName.trim());
      localStorage.setItem("planner_avatar_initials", initials.trim().toUpperCase().slice(0, 2));
      setSaved(isPt ? "Dados guardados." : "Saved.");
      setTimeout(() => setSaved(null), 1800);
    } catch {
      setSaved(isPt ? "Falha ao guardar." : "Failed to save.");
      setTimeout(() => setSaved(null), 1800);
    }
  }

  async function onLogout() {
    setLoadingLogout(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button type="button" className="side-settings-trigger" onClick={() => setOpen(true)}>
        <span className="side-settings-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M11.5 2.4 12 4a6.7 6.7 0 0 1 1.5.6l1.4-.8 1.6 1.6-.9 1.4c.2.5.4 1 .5 1.5l1.6.5v2.3l-1.6.5a6.7 6.7 0 0 1-.6 1.5l.8 1.4-1.6 1.6-1.4-.9c-.5.2-1 .4-1.5.5l-.5 1.6H8.8l-.5-1.6a6.8 6.8 0 0 1-1.5-.6l-1.4.8-1.6-1.6.9-1.4a7 7 0 0 1-.5-1.5l-1.6-.5V8.8l1.6-.5c.1-.5.3-1 .6-1.5l-.8-1.4 1.6-1.6 1.4.9c.5-.2 1-.4 1.5-.5l.5-1.6zM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor" />
          </svg>
        </span>
        <span>{isPt ? "Definições" : "Settings"}</span>
      </button>

      {open ? (
        <div className="side-settings-overlay" role="dialog" aria-modal="true">
          <div className="side-settings-modal">
            <div className="side-settings-head">
              <h3>{isPt ? "Definições" : "Settings"}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label={isPt ? "Fechar" : "Close"}>
                ×
              </button>
            </div>

            <label className="side-settings-field">
              <span>{isPt ? "Idioma" : "Language"}</span>
              <select value={lang} onChange={(e) => updateParam("lang", e.target.value)}>
                <option value="pt-PT">PT</option>
                <option value="en-US">EN</option>
                <option value="es-ES">ES</option>
                <option value="fr-FR">FR</option>
              </select>
            </label>

            <label className="side-settings-field">
              <span>{isPt ? "Moeda" : "Currency"}</span>
              <select value={currency} onChange={(e) => updateParam("currency", e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="BRL">BRL</option>
              </select>
            </label>

            <div className="side-settings-divider" />

            <p className="side-settings-subtitle">{isPt ? "Dados da conta" : "Account details"}</p>

            <label className="side-settings-field">
              <span>{isPt ? "Nome de exibição" : "Display name"}</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={isPt ? "O teu nome" : "Your name"} />
            </label>

            <label className="side-settings-field">
              <span>{isPt ? "Iniciais" : "Initials"}</span>
              <input value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))} placeholder="JO" />
            </label>

            <div className="side-settings-actions">
              <button type="button" className="side-settings-save" onClick={onSaveAccount}>
                {isPt ? "Guardar" : "Save"}
              </button>
              <button type="button" className="side-settings-logout" onClick={onLogout} disabled={loadingLogout}>
                {loadingLogout ? (isPt ? "A sair..." : "Logging out...") : logoutLabel || (isPt ? "Terminar sessão" : "Logout")}
              </button>
            </div>

            {saved ? <p className="side-settings-status">{saved}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

