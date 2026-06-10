import { useState, useCallback } from 'react';
import { searchProspects, importProspectAsContact } from '../api/prospecting';
import type { ProspectResult } from '../api/prospecting';

interface Filters {
  hasWebsite: boolean;
  hasPhone: boolean;
}

interface UseProspectingReturn {
  results: ProspectResult[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  importingId: string | null;
  filters: Filters;
  query: string;
  location: string;
  setQuery: (v: string) => void;
  setLocation: (v: string) => void;
  toggleFilter: (key: keyof Filters) => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  importContact: (prospect: ProspectResult) => Promise<boolean>;
  clearResults: () => void;
}

export function useProspecting(): UseProspectingReturn {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState<Filters>({ hasWebsite: false, hasPhone: false });
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [importingId, setImportingId] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim() && !location.trim()) {
      setError('Preencha o tipo de negócio ou a localização para buscar.');
      return;
    }
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await searchProspects({
        query: query.trim(),
        location: location.trim(),
        filters: { hasWebsite: filters.hasWebsite || undefined, hasPhone: filters.hasPhone || undefined },
        page: 1,
        pageSize: 20,
      });
      setResults(response.results);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar prospectos. Verifique sua conexão.');
      setResults([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [query, location, filters]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = currentPage + 1;
    setLoading(true);

    try {
      const response = await searchProspects({
        query: query.trim(),
        location: location.trim(),
        filters: { hasWebsite: filters.hasWebsite || undefined, hasPhone: filters.hasPhone || undefined },
        page: nextPage,
        pageSize: 20,
      });
      setResults(prev => [...prev, ...response.results]);
      setCurrentPage(nextPage);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mais resultados.');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentPage, query, location, filters]);

  const importContact = useCallback(async (prospect: ProspectResult): Promise<boolean> => {
    setImportingId(prospect.osmId);
    try {
      await importProspectAsContact(prospect);
      return true;
    } catch (err) {
      throw err;
    } finally {
      setImportingId(null);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
    setCurrentPage(1);
  }, []);

  const toggleFilter = useCallback((key: keyof Filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    results,
    loading,
    error,
    total,
    hasMore,
    importingId,
    filters,
    query,
    location,
    setQuery,
    setLocation,
    toggleFilter,
    search,
    loadMore,
    importContact,
    clearResults,
  };
}
