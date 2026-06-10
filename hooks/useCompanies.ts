// Hook para buscar empresas reais do Chatwoot com paginação incremental

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getCompanies } from '../api/chatwoot';
import type { CompaniesResponse, CompanyFilters, ChatwootCompany } from '../types/chatwoot';

interface UseCompaniesReturn {
  data: { payload: ChatwootCompany[]; meta: { count: number } } | null;
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  setFilters: (filters: CompanyFilters) => void;
  filters: CompanyFilters;
}

const DEFAULT_PAGE_SIZE = 30;

export function useCompanies(initialFilters?: CompanyFilters): UseCompaniesReturn {
  const [filters, setFiltersState] = useState<CompanyFilters>({
    page: 1,
    per_page: DEFAULT_PAGE_SIZE,
    ...initialFilters,
  });
  const [companies, setCompanies] = useState<ChatwootCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const lastPayloadLengthRef = useRef(0);

  const fetchCompanies = useCallback(async (page: number, isLoadMore: boolean = false) => {
    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await getCompanies({ ...filters, page });
      
      if (isLoadMore) {
        setCompanies(prev => [...prev, ...response.payload]);
      } else {
        setCompanies(response.payload);
        setCurrentPage(1);
      }
      
      lastPayloadLengthRef.current = response.payload.length;
      
      if (response.meta?.count !== undefined) {
        setTotalCount(response.meta.count);
      } else if (!isLoadMore) {
        setTotalCount(response.payload.length);
      }
      
      setCurrentPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('[CaenCRM] Erro ao buscar empresas:', message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const hasMore = useMemo(() => {
    if (totalCount > 0) {
      return companies.length < totalCount;
    }
    return lastPayloadLengthRef.current >= DEFAULT_PAGE_SIZE;
  }, [companies.length, totalCount]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    await fetchCompanies(nextPage, true);
  }, [loadingMore, hasMore, currentPage, fetchCompanies]);

  const refetch = useCallback(async () => {
    await fetchCompanies(1, false);
  }, [fetchCompanies]);

  const setFilters = useCallback((newFilters: CompanyFilters) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
    setCompanies([]);
    setCurrentPage(1);
    lastPayloadLengthRef.current = 0;
  }, []);

  useEffect(() => {
    fetchCompanies(1, false);
  }, [fetchCompanies]);

  const data = companies.length > 0 || loading || error
    ? { payload: companies, meta: { count: totalCount } }
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

export default useCompanies;