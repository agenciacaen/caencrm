import { supabase } from './supabase';
import { getContacts, getCompanies } from './chatwoot';

export async function syncContactsFromChatwoot() {
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const res = await getContacts({ page, per_page: 100 });
    const list = res.payload || [];
    for (const c of list) {
      const exists = c.email
        ? await supabase.from('contacts').select('id,chatwoot_id').eq('email', c.email).maybeSingle()
        : c.phone_number
          ? await supabase.from('contacts').select('id,chatwoot_id').eq('phone', c.phone_number).maybeSingle()
          : null;

      if (exists?.data && exists.data.chatwoot_id !== c.id) {
        const { error } = await supabase.from('contacts').update({
          chatwoot_id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone_number || null,
          avatar: c.thumbnail || null,
          company_id: (c.custom_attributes?.company_id || c.additional_attributes?.company_id) as number | undefined || null,
          additional_attributes: c.additional_attributes || {},
          custom_attributes: c.custom_attributes || {},
        }).eq('id', exists.data.id);
        if (error) console.error('Erro ao atualizar contato existente', c.id, error);
        else total++;
      } else {
        const { error } = await supabase.from('contacts').upsert({
          chatwoot_id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone_number || null,
          avatar: c.thumbnail || null,
          company_id: (c.custom_attributes?.company_id || c.additional_attributes?.company_id) as number | undefined || null,
          additional_attributes: c.additional_attributes || {},
          custom_attributes: c.custom_attributes || {},
        }, { onConflict: 'chatwoot_id' });
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
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const res = await getCompanies({ page, per_page: 100 });
    const list = res.payload || [];
    for (const c of list) {
      const { error } = await supabase.from('companies').upsert({
        chatwoot_id: c.id,
        name: c.name,
        website: c.website || null,
        phone_number: c.phone_number || null,
        description: c.description || null,
        industry: c.industry || null,
        additional_attributes: (c as any).additional_attributes || {},
        custom_attributes: (c as any).custom_attributes || {},
      }, { onConflict: 'chatwoot_id' });
      if (error) console.error('Erro ao sincronizar empresa', c.id, error);
      else total++;
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
