"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SidebarSettings({
  lang,
  currency,
  isPt,
  userDisplayName = "",
  onUpdated
}: {
  lang: string;
  currency: string;
  isPt: boolean;
  userDisplayName?: string;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userDisplayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(userDisplayName);
  }, [userDisplayName]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(search.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function onSaveAccount() {
    setSaving(true);
    setSaved(null);
    try {
      const payload: Record<string, string> = {};
      if (displayName.trim()) payload.displayName = displayName.trim();
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setSaved(data.error || (isPt ? "Falha ao guardar." : "Failed to save."));
        setTimeout(() => setSaved(null), 2600);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setSaved(isPt ? "Dados guardados." : "Saved.");
      router.refresh();
      setTimeout(() => setSaved(null), 1800);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
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
              <span>{isPt ? "Password atual" : "Current password"}</span>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="******" />
            </label>

            <label className="side-settings-field">
              <span>{isPt ? "Nova password" : "New password"}</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="******" />
            </label>

            <div className="side-settings-actions">
              <button type="button" className="side-settings-save" onClick={onSaveAccount} disabled={saving}>
                {saving ? (isPt ? "A guardar..." : "Saving...") : isPt ? "Guardar" : "Save"}
              </button>
              <button type="button" className="side-settings-save side-settings-close" onClick={() => setOpen(false)}>
                {isPt ? "Fechar" : "Close"}
              </button>
            </div>

            {saved ? <p className="side-settings-status">{saved}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
