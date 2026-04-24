"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch (error) {
        console.error("pwa.sw.register.error", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
