/* eslint-disable no-empty */
"use client";
import { useEffect } from "react";
import { resetAllCaches } from "../services/cacheRegistry";

const INACTIVITY_MS = 6 * 60 * 60 * 1000; // 6h
const KEY = "app:lastVisitAt";

export default function CacheBootstrap() {
  useEffect(() => {
    // --- 1) Lectura segura del storage ---
    let last = 0;
    try {
      last = Number(localStorage.getItem(KEY) || 0);
    } catch {
      // Safari Private Mode
      last = 0;
    }

    const now = Date.now();
    const longIdle = Number.isFinite(last) && now - last > INACTIVITY_MS;

    if (longIdle) {
      try {
        resetAllCaches();
        window.dispatchEvent(new Event("caches-reset"));
      } catch {
        /* evitar crash */
      }
    }

    // --- 2) Guardar timestamp de visita ---
    const touch = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* Safari Private Mode */
      }
    };

    touch(); // primera marca

    document.addEventListener("visibilitychange", touch);
    window.addEventListener("pagehide", touch);
    window.addEventListener("beforeunload", touch);

    // --- 3) Coordinar entre pestañas (seguro) ---
    let bc: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("app-activity");
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "reset-caches") {
          try {
            resetAllCaches();
            window.dispatchEvent(new Event("caches-reset"));
          } catch {}
        }
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", touch);
      window.removeEventListener("pagehide", touch);
      window.removeEventListener("beforeunload", touch);
      if (bc) bc.close();
    };
  }, []);

  return null;
}
