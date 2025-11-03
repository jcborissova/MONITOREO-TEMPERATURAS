/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useGlobalLoading } from "../context/GlobalLoadingContext";

/**
 * Intercepta window.fetch y axios (si existe) para activar el loader global automáticamente.
 * Úsalo una sola vez (por ejemplo, en App).
 */
export const useSetupLoadInterceptors = () => {
  const { start, stop } = useGlobalLoading();

  useEffect(() => {
    // ---- Interceptor para fetch ----
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      start();
      try {
        const res = await originalFetch(...args);
        return res;
      } finally {
        stop();
      }
    };

    // ---- Interceptor para Axios (si está presente) ----
    const anyWin = window as any;
    let ejectors: Array<() => void> = [];

    if (anyWin.axios?.interceptors) {
      const reqId = anyWin.axios.interceptors.request.use((config: any) => {
        start();
        return config;
      });
      const resId = anyWin.axios.interceptors.response.use(
        (response: any) => {
          stop();
          return response;
        },
        (error: any) => {
          stop();
          return Promise.reject(error);
        }
      );
      ejectors.push(() => anyWin.axios.interceptors.request.eject(reqId));
      ejectors.push(() => anyWin.axios.interceptors.response.eject(resId));
    }

    return () => {
      // Restaurar fetch
      window.fetch = originalFetch;
      // Eyectar interceptores axios
      ejectors.forEach((fn) => fn());
    };
  }, [start, stop]);
};
