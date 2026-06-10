import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { syncCompaniesFromChatwoot } from '../api/sync';
import type { ChatwootCompany } from '../types/chatwoot';

interface SupabaseCompany {
  id: string;
  chatwoot_id: number | null;
  name: string;
  website: string | null;
  phone_number: string | null;
  description: string | null;
  industry: string | null;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapToChatwootCompany(sc: SupabaseCompany): ChatwootCompany | null {
  if (!sc.chatwoot_id) return null;
  return {
    id: sc.chatwoot_id,
    name: sc.name,
    website: sc.website || undefined,
    phone_number: sc.phone_number || undefined,
    description: sc.description || undefined,
    industry: sc.industry || undefined,
    custom_attributes: sc.custom_attributes as Record<string, unknown>,
  };
}

interface UseCompaniesReturn {
  companies: ChatwootCompany[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<ChatwootCompany[]>;
  refresh: () => Promise<void>;
  syncFromChatwoot: () => Promise<void>;
}

export function useCompaniesSupabase(): UseCompaniesReturn {
  const [companies, setCompanies] = useState<ChatwootCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (err) throw err;
      setCompanies((data as SupabaseCompany[] || []).map(mapToChatwootCompany).filter(Boolean) as ChatwootCompany[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const search = useCallback(async (query: string): Promise<ChatwootCompany[]> => {
    if (!query.trim()) {
      const { data } = await supabase.from('companies').select('*').order('name').limit(50);
      return (data as SupabaseCompany[] || []).map(mapToChatwootCompany).filter(Boolean) as ChatwootCompany[];
    }
    const { data } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50);
    return (data as SupabaseCompany[] || []).map(mapToChatwootCompany).filter(Boolean) as ChatwootCompany[];
  }, []);

  const syncFromChatwoot = useCallback(async () => {
    setLoading(true);
    try {
      await syncCompaniesFromChatwoot();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao sincronizar');
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  return { companies, loading, error, search, refresh: fetchAll, syncFromChatwoot };
}
