/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type Ctx = {
  start: () => void;
  stop: () => void;
  isLoading: boolean;
};

const GlobalLoadingContext = createContext<Ctx | null>(null);

export const GlobalLoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [counter, setCounter] = useState(0);
  const [visible, setVisible] = useState(false);

  const counterRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const minShowMs = 300;
  const delayShowMs = 120;

  const start = useCallback(() => {
    counterRef.current += 1;
    setCounter(counterRef.current);

    // cancelar hide previo
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    // si ya es visible, no haces nada
    if (visible) return;

    // mostrar con pequeño delay para evitar flash
    if (showTimerRef.current == null) {
      showTimerRef.current = window.setTimeout(() => {
        setVisible(true);
        showTimerRef.current = null;
      }, delayShowMs);
    }
  }, [visible]);

  const stop = useCallback(() => {
    counterRef.current = Math.max(0, counterRef.current - 1);
    setCounter(counterRef.current);

    if (counterRef.current > 0) return;

    // ya no hay cargas → aseguramos minShowMs antes de ocultar
    if (hideTimerRef.current == null) {
      hideTimerRef.current = window.setTimeout(() => {
        if (counterRef.current === 0) {
          setVisible(false);
        }
        hideTimerRef.current = null;
      }, minShowMs);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ start, stop, isLoading: counter > 0 }),
    [start, stop, counter]
  );

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}

      {visible && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-[1px] flex items-center justify-center z-[9999]">
          <div className="bg-white shadow-xl px-6 py-5 rounded-xl flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            <span className="text-sm text-gray-700">Cargando…</span>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalLoading = () => {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) throw new Error("useGlobalLoading must be used inside provider");
  return ctx;
};
