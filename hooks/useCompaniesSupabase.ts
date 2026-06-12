import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { getAccountId } from '../api/chatwoot';
import { syncCompaniesFromChatwoot } from '../api/sync';
import type { ChatwootCompany } from '../types/chatwoot';

export type CRMCompany = ChatwootCompany & {
  supabase_id: string;
  chatwoot_id: number | null;
};

interface SupabaseCompany {
  id: string;
  chatwoot_id: number | null;
  name: string;
  website: string | null;
  phone_number: string | null;
  description: string | null;
  industry: string | null;
  account_id: string;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function fallbackId(id: string): number {
  const parsed = parseInt(id.replace(/\D/g, '').slice(0, 8), 10);
  return Number.isFinite(parsed) ? -parsed : -1;
}

function mapToCompany(sc: SupabaseCompany): CRMCompany {
  return {
    id: sc.chatwoot_id ?? fallbackId(sc.id),
    supabase_id: sc.id,
    chatwoot_id: sc.chatwoot_id,
    name: sc.name,
    website: sc.website || null,
    phone_number: sc.phone_number || null,
    description: sc.description || null,
    industry: sc.industry || undefined,
    custom_attributes: sc.custom_attributes as Record<string, unknown>,
    additional_attributes: sc.additional_attributes as Record<string, unknown>,
    created_at: sc.created_at,
    updated_at: sc.updated_at,
  };
}

interface UseCompaniesReturn {
  companies: CRMCompany[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<CRMCompany[]>;
  refresh: () => Promise<void>;
  syncFromChatwoot: () => Promise<void>;
}

export function useCompaniesSupabase(): UseCompaniesReturn {
  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accountId = getAccountId();
      const { data, error: err } = await supabase
        .from('companies')
        .select('*')
        .eq('account_id', accountId)
        .order('name');
      if (err) throw err;
      setCompanies((data as SupabaseCompany[] || []).map(mapToCompany));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const search = useCallback(async (query: string): Promise<CRMCompany[]> => {
    const accountId = getAccountId();
    if (!query.trim()) {
      const { data, error: err } = await supabase.from('companies').select('*').eq('account_id', accountId).order('name').limit(50);
      if (err) throw err;
      return (data as SupabaseCompany[] || []).map(mapToCompany);
    }
    const { data, error: err } = await supabase
      .from('companies')
      .select('*')
      .eq('account_id', accountId)
      .or(`name.ilike.%${query}%,website.ilike.%${query}%,phone_number.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name')
      .limit(50);
    if (err) throw err;
    return (data as SupabaseCompany[] || []).map(mapToCompany);
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
