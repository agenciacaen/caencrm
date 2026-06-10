import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { syncContactsFromChatwoot } from '../api/sync';
import type { ChatwootContact } from '../types/chatwoot';

interface SupabaseContact {
  id: string;
  chatwoot_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  company_id: number | null;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapToChatwootContact(sc: SupabaseContact): ChatwootContact | null {
  if (!sc.chatwoot_id) return null;
  return {
    id: sc.chatwoot_id,
    name: sc.name,
    email: sc.email || undefined,
    phone_number: sc.phone || undefined,
    thumbnail: sc.avatar || undefined,
    custom_attributes: { ...sc.custom_attributes, company_id: sc.company_id } as Record<string, unknown>,
    additional_attributes: sc.additional_attributes as { company_id?: number; social_profiles?: unknown },
    availability_status: null,
  };
}

interface UseContactsReturn {
  contacts: ChatwootContact[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<ChatwootContact[]>;
  refresh: () => Promise<void>;
  syncFromChatwoot: () => Promise<void>;
}

export function useContactsSupabase(): UseContactsReturn {
  const [contacts, setContacts] = useState<ChatwootContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('contacts')
        .select('*')
        .order('name');
      if (err) throw err;
      setContacts((data as SupabaseContact[] || []).map(mapToChatwootContact).filter(Boolean) as ChatwootContact[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const search = useCallback(async (query: string): Promise<ChatwootContact[]> => {
    if (!query.trim()) {
      const { data } = await supabase.from('contacts').select('*').order('name').limit(50);
      return (data as SupabaseContact[] || []).map(mapToChatwootContact).filter(Boolean) as ChatwootContact[];
    }
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50);
    return (data as SupabaseContact[] || []).map(mapToChatwootContact).filter(Boolean) as ChatwootContact[];
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
