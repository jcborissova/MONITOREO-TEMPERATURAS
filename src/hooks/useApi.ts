/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (apiCall: () => Promise<T>) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiCall();
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error: any) {
        const errorMessage = error.message || 'Ocurrió un error inesperado';
        setState({ data: null, loading: false, error: errorMessage });
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    execute,
  };
}