"use client";
import { useEffect } from "react";
import { resetAllCaches } from "../services/cacheRegistry";

const INACTIVITY_MS = 6 * 60 * 60 * 1000; // 6h sin abrir => limpiar
const KEY = "app:lastVisitAt";

export default function CacheBootstrap() {
  useEffect(() => {
    const now = Date.now();
    const last = Number(localStorage.getItem(KEY) || 0);
    const longIdle = Number.isFinite(last) && now - last > INACTIVITY_MS;

    if (longIdle) {
      resetAllCaches();
      window.dispatchEvent(new Event("caches-reset"));
    }

    // marca visita actual
    localStorage.setItem(KEY, String(now));

    // mantiene actualizado mientras la pestaña vive
    const touch = () => localStorage.setItem(KEY, String(Date.now()));
    document.addEventListener("visibilitychange", touch);
    window.addEventListener("pagehide", touch);
    window.addEventListener("beforeunload", touch);

    // opcional: coordinar entre pestañas
    const bc = new BroadcastChannel("app-activity");
    bc.onmessage = (ev) => {
      if (ev?.data?.type === "reset-caches") {
        resetAllCaches();
        window.dispatchEvent(new Event("caches-reset"));
      }
    };

    return () => {
      document.removeEventListener("visibilitychange", touch);
      window.removeEventListener("pagehide", touch);
      window.removeEventListener("beforeunload", touch);
      bc.close();
    };
  }, []);

  return null;
}
