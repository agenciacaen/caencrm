// ============================================
// Hook genérico para chamadas à API do Chatwoot
// Gerencia loading, erro e dados
// ============================================

import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => void;
  refetchBackground: () => void;
}

export function useChatwootApi<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = []
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async (isBackground: boolean = false) => {
    if (!isBackground) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }
    try {
      const result = await fetcher();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setState({ data: null, loading: false, error: message });
      console.error('[CaenCRM] Erro na API:', message);
    }
  }, dependencies);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  const refetchBackground = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { 
    ...state, 
    refetch,
    refetchBackground
  };
}
