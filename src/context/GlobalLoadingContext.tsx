/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Ctx = {
  start: () => void;
  stop: () => void;
  /** true si hay al menos 1 proceso cargando */
  isLoading: boolean;
};

const GlobalLoadingContext = createContext<Ctx | null>(null);

export const GlobalLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [counter, setCounter] = useState(0);
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);
  const minShowMs = 300; // evita parpadeos

  const start = useCallback(() => {
    setCounter((c) => c + 1);
    // mostrar con pequeño delay para evitar flash en cargas instantáneas
    if (showTimer.current == null) {
      showTimer.current = window.setTimeout(() => {
        setVisible(true);
        showTimer.current = null;
      }, 120);
    }
  }, []);

  const stop = useCallback(() => {
    setCounter((c) => Math.max(0, c - 1));
    // cuando llega a 0, mantener mínimo 300ms visible
    setTimeout(() => {
      if (counter <= 1) setVisible(false);
    }, minShowMs);
  }, [counter]);

  const value = useMemo<Ctx>(() => ({ start, stop, isLoading: counter > 0 }), [start, stop, counter]);

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      {/* Overlay global */}
      {visible && (
        <div className="fixed inset-0 z-[9999] bg-black/25 backdrop-blur-[1px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 bg-white rounded-xl shadow-lg px-6 py-5">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            <span className="text-sm text-gray-700">Cargando…</span>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  return ctx;
};
