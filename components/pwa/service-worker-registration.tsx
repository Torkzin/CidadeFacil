"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let updateTimer: number | undefined;
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      void registration.update();
      updateTimer = window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    }).catch(() => undefined);

    return () => {
      if (updateTimer) window.clearInterval(updateTimer);
    };
  }, []);
  return null;
}
