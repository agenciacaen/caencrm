import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabase';
import type { Deal, DealStage } from '../types/deals';

interface DealRow {
  id: string;
  title: string;
  value: number;
  stage: string;
  priority: number;
  contact_id: number | null;
  company_id: number | null;
  conversation_id: number | null;
  assigned_to: string | null;
  expected_close_date: string | null;
  products: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    value: Number(row.value),
    stage: row.stage as DealStage,
    priority: row.priority as 0 | 1 | 2 | 3 | 4 | 5,
    contactId: row.contact_id,
    companyId: row.company_id,
    conversationId: row.conversation_id,
    assignedTo: row.assigned_to,
    expectedCloseDate: row.expected_close_date,
    products: row.products,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDealToRow(deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: deal.title,
    value: deal.value,
    stage: deal.stage,
    priority: deal.priority,
    contact_id: deal.contactId,
    company_id: deal.companyId,
    conversation_id: deal.conversationId,
    assigned_to: deal.assignedTo,
    expected_close_date: deal.expectedCloseDate,
    products: deal.products,
    notes: deal.notes,
  };
}

interface UseDealsReturn {
  allDeals: Deal[];
  loading: boolean;
  getDealsForContact: (contactId: number) => Promise<Deal[]>;
  getDealsForCompany: (companyId: number) => Promise<Deal[]>;
  createDeal: (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deal>;
  updateDeal: (dealId: string, updates: Partial<Deal>) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  refresh: () => Promise<void>;
  error: string | null;
}

export function useDeals(): UseDealsReturn {
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAllDeals((data as DealRow[] || []).map(mapRowToDeal));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getDealsForContact = useCallback(async (contactId: number): Promise<Deal[]> => {
    const { data, error: err } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (err) throw err;
    return (data as DealRow[] || []).map(mapRowToDeal);
  }, []);

  const getDealsForCompany = useCallback(async (companyId: number): Promise<Deal[]> => {
    const { data, error: err } = await supabase
      .from('deals')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (err) throw err;
    return (data as DealRow[] || []).map(mapRowToDeal);
  }, []);

  const createDeal = useCallback(async (
    data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Deal> => {
    const row = mapDealToRow(data);
    const { data: inserted, error: err } = await supabase
      .from('deals')
      .insert(row)
      .select()
      .single();
    if (err) throw err;
    const deal = mapRowToDeal(inserted as DealRow);
    setAllDeals(prev => [deal, ...prev]);
    return deal;
  }, []);

  const updateDeal = useCallback(async (dealId: string, updates: Partial<Deal>) => {
    const row: Record<string, unknown> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.value !== undefined) row.value = updates.value;
    if (updates.stage !== undefined) row.stage = updates.stage;
    if (updates.priority !== undefined) row.priority = updates.priority;
    if (updates.contactId !== undefined) row.contact_id = updates.contactId;
    if (updates.companyId !== undefined) row.company_id = updates.companyId;
    if (updates.conversationId !== undefined) row.conversation_id = updates.conversationId;
    if (updates.assignedTo !== undefined) row.assigned_to = updates.assignedTo;
    if (updates.expectedCloseDate !== undefined) row.expected_close_date = updates.expectedCloseDate;
    if (updates.products !== undefined) row.products = updates.products;
    if (updates.notes !== undefined) row.notes = updates.notes;

    const { error: err } = await supabase
      .from('deals')
      .update(row)
      .eq('id', dealId);
    if (err) throw err;

    setAllDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
  }, []);

  const deleteDeal = useCallback(async (dealId: string) => {
    const { error: err } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId);
    if (err) throw err;
    setAllDeals(prev => prev.filter(d => d.id !== dealId));
  }, []);

  return {
    allDeals,
    loading,
    error,
    getDealsForContact,
    getDealsForCompany,
    createDeal,
    updateDeal,
    deleteDeal,
    refresh: fetchAll,
  };
}

export default useDeals;
