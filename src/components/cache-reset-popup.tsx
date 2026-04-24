"use client";

import { useState } from "react";

export function CacheResetPopup() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClearCache() {
    if (running) return;
    setRunning(true);
    setError(null);

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }

      const url = new URL(window.location.href);
      url.searchParams.set("v", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      setError("Could not clear cache automatically. Please close this tab and open the site again.");
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[70] rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 shadow-lg shadow-amber-200"
      >
        Cache tools
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-lg font-bold text-slate-900">Temporary Cache Fix</p>
            <p className="mt-2 text-sm text-slate-600">
              Use this only while we stabilize deployment cache behavior.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>1. Unregister service workers</li>
              <li>2. Delete browser caches</li>
              <li>3. Reload with a fresh version parameter</li>
            </ul>

            {error ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleClearCache()}
                disabled={running}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {running ? "Cleaning..." : "Clear cache now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
