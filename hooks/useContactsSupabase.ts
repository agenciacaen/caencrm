import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { getAccountId } from '../api/chatwoot';
import { syncContactsFromChatwoot } from '../api/sync';
import type { ChatwootContact } from '../types/chatwoot';

export type CRMContact = ChatwootContact & {
  supabase_id: string;
  chatwoot_id: number | null;
};

interface SupabaseContact {
  id: string;
  chatwoot_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  company_id: number | null;
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

function mapToContact(sc: SupabaseContact): CRMContact {
  return {
    id: sc.chatwoot_id ?? fallbackId(sc.id),
    supabase_id: sc.id,
    chatwoot_id: sc.chatwoot_id,
    name: sc.name,
    email: sc.email || null,
    phone_number: sc.phone || null,
    thumbnail: sc.avatar || '',
    custom_attributes: { ...sc.custom_attributes, company_id: sc.company_id } as Record<string, unknown>,
    additional_attributes: sc.additional_attributes as { company_id?: number; social_profiles?: unknown },
    identifier: null,
    created_at: Math.floor(new Date(sc.created_at).getTime() / 1000),
    last_activity_at: null,
    availability_status: 'offline',
  };
}

interface UseContactsReturn {
  contacts: CRMContact[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<CRMContact[]>;
  refresh: () => Promise<void>;
  syncFromChatwoot: () => Promise<void>;
}

export function useContactsSupabase(): UseContactsReturn {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accountId = getAccountId();
      const { data, error: err } = await supabase
        .from('contacts')
        .select('*')
        .eq('account_id', accountId)
        .order('name');
      if (err) throw err;
      setContacts((data as SupabaseContact[] || []).map(mapToContact));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const search = useCallback(async (query: string): Promise<CRMContact[]> => {
    const accountId = getAccountId();
    if (!query.trim()) {
      const { data, error: err } = await supabase.from('contacts').select('*').eq('account_id', accountId).order('name').limit(50);
      if (err) throw err;
      return (data as SupabaseContact[] || []).map(mapToContact);
    }
    const { data, error: err } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('name')
      .limit(50);
    if (err) throw err;
    return (data as SupabaseContact[] || []).map(mapToContact);
  }, []);

  const syncFromChatwoot = useCallback(async () => {
    setLoading(true);
    try {
      await syncContactsFromChatwoot();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao sincronizar');
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  return { contacts, loading, error, search, refresh: fetchAll, syncFromChatwoot };
}
