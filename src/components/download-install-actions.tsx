"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function DownloadInstallActions() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [helperText, setHelperText] = useState<string>("");
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) {
      setPlatform("android");
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform("ios");
    }

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
    setHelperText("Open this page in Chrome on Android to install the app directly.");
  };

  const handleIosInstall = async () => {
    setHelperText("");

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Planqly Assets",
          text: "Install Planqly on your iPhone.",
          url: window.location.origin
        });
        return;
      } catch {
        // Fall through to Safari hint if the share sheet is cancelled or unavailable.
      }
    }

    setHelperText("Open this page in Safari to add Planqly to your Home Screen.");
  };

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <button
        type="button"
        onClick={() => void handleAndroidInstall()}
        className={`rounded-[28px] border p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
          platform === "android"
            ? "border-emerald-500 bg-emerald-600 text-white"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Android</p>
            <h2 className="mt-2 text-2xl font-black">Download App</h2>
            <p className={`mt-2 text-sm ${platform === "android" ? "text-emerald-50" : "text-slate-500"}`}>
              Direct install for Android devices.
            </p>
          </div>
          <span className="text-2xl">↓</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => void handleIosInstall()}
        className={`rounded-[28px] border p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
          platform === "ios"
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">iPhone</p>
            <h2 className="mt-2 text-2xl font-black">Install App</h2>
            <p className={`mt-2 text-sm ${platform === "ios" ? "text-slate-300" : "text-slate-500"}`}>
              Opens the fastest install flow available on iPhone.
            </p>
          </div>
          <span className="text-2xl">↓</span>
        </div>
      </button>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 md:col-span-2">
        <p className="font-semibold">Fast install</p>
        <p className="mt-1 text-blue-800">
          The page detects the device and triggers the closest native install flow available.
        </p>
      </div>

      {helperText ? <p className="md:col-span-2 text-sm text-slate-600">{helperText}</p> : null}
    </div>
  );
}
