// Hook para buscar contatos reais do Chatwoot com paginação incremental

import { useState, useCallback, useMemo, useEffect } from 'react';
import { getContacts } from '../api/chatwoot';
import type { ContactsResponse, ContactFilters, ChatwootContact } from '../types/chatwoot';

interface UseContactsReturn {
  data: { payload: ChatwootContact[]; meta: { count: number } } | null;
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  setFilters: (filters: ContactFilters) => void;
  filters: ContactFilters;
}

export function useContacts(initialFilters?: ContactFilters): UseContactsReturn {
  const [filters, setFiltersState] = useState<ContactFilters>({
    page: 1,
    ...initialFilters,
  });
  const [contacts, setContacts] = useState<ChatwootContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchContacts = useCallback(async (page: number, isLoadMore: boolean = false) => {
    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await getContacts({ ...filters, page });
      
      if (isLoadMore) {
        setContacts(prev => [...prev, ...response.payload]);
      } else {
        setContacts(response.payload);
        setCurrentPage(1);
      }
      
      setTotalCount(response.meta?.count || response.payload.length);
      setCurrentPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('[CaenCRM] Erro ao buscar contatos:', message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const hasMore = useMemo(() => {
    return contacts.length < totalCount;
  }, [contacts.length, totalCount]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    await fetchContacts(nextPage, true);
  }, [loadingMore, hasMore, currentPage, fetchContacts]);

  const refetch = useCallback(async () => {
    await fetchContacts(1, false);
  }, [fetchContacts]);

  const setFilters = useCallback((newFilters: ContactFilters) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
    setContacts([]);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    fetchContacts(1, false);
  }, [fetchContacts]);

  const data = contacts.length > 0 || loading || error
    ? { payload: contacts, meta: { count: totalCount } }
    : null;

  return {
    data,
    loading,
    error,
    loadingMore,
    hasMore,
    currentPage,
    totalCount,
    loadMore,
    refetch,
    setFilters,
    filters,
  };
}

export default useContacts;