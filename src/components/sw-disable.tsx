"use client";

import { useEffect } from "react";

export function SwDisable() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const disableServiceWorkers = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        }
      } catch (error) {
        console.error("sw.disable.error", error);
      }
    };

    void disableServiceWorkers();
  }, []);

  return null;
}
