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
  const [iosModalOpen, setIosModalOpen] = useState(false);

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
    setIosModalOpen(true);

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
    <>
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
                Guided install flow for iPhone.
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

      {iosModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">iPhone Install</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Add Planqly to your Home Screen</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  iPhone requires confirmation inside Safari. The share menu may already be open for you.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIosModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                <p className="mt-2 text-lg font-bold text-slate-900">Tap Share</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Step 2</p>
                <p className="mt-2 text-lg font-bold text-slate-900">Tap Add to Home Screen</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleIosInstall()}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Open Share Again
              </button>
              <button
                type="button"
                onClick={() => setIosModalOpen(false)}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
