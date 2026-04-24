"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const cleanupServiceWorkers = async () => {
      try {
        // Temporary stability mode:
        // remove old service workers/caches to stop version oscillation on refresh.
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if (typeof window !== "undefined" && "caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.filter((key) => key.startsWith("planqly-pwa-")).map((key) => window.caches.delete(key)));
        }
      } catch (error) {
        console.error("pwa.sw.cleanup.error", error);
      }
    };

    void cleanupServiceWorkers();
  }, []);

  return null;
}
