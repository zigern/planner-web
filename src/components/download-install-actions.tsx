"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function DownloadInstallActions() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [helperText, setHelperText] = useState<string>("");

  const isAndroid = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android/i.test(navigator.userAgent);
  }, []);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleAndroidInstall = async () => {
    setHelperText("");
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setHelperText("On Android, open this page in Chrome and tap Install App or Add to Home screen.");
  };

  const handleIosInstall = () => {
    setHelperText("On iPhone, open Safari → Share → Add to Home Screen.");
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">Quick install</p>
      <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => void handleAndroidInstall()}
          className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto ${
            isAndroid ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          Install on Android
        </button>
        <button
          type="button"
          onClick={handleIosInstall}
          className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold sm:w-auto ${
            isIOS ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          Install on iPhone
        </button>
      </div>
      {helperText ? <p className="mt-3 text-sm text-slate-600">{helperText}</p> : null}
    </div>
  );
}
