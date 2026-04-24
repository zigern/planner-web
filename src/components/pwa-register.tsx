"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const cleanupKey = "planqly-sw-clean-v1";
        if (typeof window !== "undefined" && !window.localStorage.getItem(cleanupKey)) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ("caches" in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith("planqly-pwa-")).map((key) => window.caches.delete(key)));
          }

          window.localStorage.setItem(cleanupKey, "1");
          window.location.reload();
          return;
        }

        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("pwa.sw.register.error", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
