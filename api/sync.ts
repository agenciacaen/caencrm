import { supabase } from './supabase';
import { getAccountId, getContacts, getCompanies } from './chatwoot';

export async function syncContactsFromChatwoot() {
  const accountId = getAccountId();
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const res = await getContacts({ page, per_page: 100 });
    const list = res.payload || [];
    for (const c of list) {
      const row = {
        chatwoot_id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone_number || null,
        avatar: c.thumbnail || null,
        company_id: (c.custom_attributes?.company_id || c.additional_attributes?.company_id) as number | undefined || null,
        account_id: accountId,
        additional_attributes: c.additional_attributes || {},
        custom_attributes: c.custom_attributes || {},
      };

      const byChatwoot = await supabase.from('contacts').select('id,chatwoot_id').eq('chatwoot_id', c.id).maybeSingle();
      const exists = byChatwoot.data
        ? byChatwoot
        : c.email
          ? await supabase.from('contacts').select('id,chatwoot_id').eq('email', c.email).maybeSingle()
          : c.phone_number
            ? await supabase.from('contacts').select('id,chatwoot_id').eq('phone', c.phone_number).maybeSingle()
            : null;

      if (exists?.error) {
        console.error('Erro ao procurar contato existente', c.id, exists.error);
      } else if (exists?.data) {
        const { error } = await supabase.from('contacts').update(row).eq('id', exists.data.id);
        if (error) console.error('Erro ao atualizar contato existente', c.id, error);
        else total++;
      } else {
        const { error } = await supabase.from('contacts').insert(row);
        if (error) console.error('Erro ao sincronizar contato', c.id, error);
        else total++;
      }
    }
    hasMore = list.length >= 100;
    page++;
  }
  return total;
}

export async function syncCompaniesFromChatwoot() {
  const accountId = getAccountId();
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const res = await getCompanies({ page, per_page: 100 });
    const list = res.payload || [];
    for (const c of list) {
      const row = {
        chatwoot_id: c.id,
        name: c.name,
        website: c.website || null,
        phone_number: c.phone_number || null,
        description: c.description || null,
        industry: c.industry || null,
        account_id: accountId,
        additional_attributes: (c as any).additional_attributes || {},
        custom_attributes: (c as any).custom_attributes || {},
      };

      const byChatwoot = await supabase.from('companies').select('id').eq('chatwoot_id', c.id).maybeSingle();
      const fallback = !byChatwoot.data
        ? await supabase.from('companies').select('id').eq('name', c.name).is('chatwoot_id', null).limit(1)
        : null;
      const existingId = byChatwoot.data?.id || fallback?.data?.[0]?.id;

      if (byChatwoot.error || fallback?.error) {
        console.error('Erro ao procurar empresa existente', c.id, byChatwoot.error || fallback?.error);
      } else if (existingId) {
        const { error } = await supabase.from('companies').update(row).eq('id', existingId);
        if (error) console.error('Erro ao atualizar empresa existente', c.id, error);
        else total++;
      } else {
        const { error } = await supabase.from('companies').insert(row);
        if (error) console.error('Erro ao sincronizar empresa', c.id, error);
        else total++;
      }
    }
    hasMore = list.length >= 100;
    page++;
  }
  return total;
}

export async function syncAll() {
  const contacts = await syncContactsFromChatwoot();
  const companies = await syncCompaniesFromChatwoot();
  return { contacts, companies };
}
