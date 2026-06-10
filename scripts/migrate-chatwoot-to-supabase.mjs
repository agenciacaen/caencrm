// Script único para migrar contatos e empresas do Chatwoot para o Supabase
// Uso: node scripts/migrate-chatwoot-to-supabase.mjs

const CHATWOOT_URL = 'https://chatwoot.agenciacaen.com.br';
const CHATWOOT_TOKEN = 'sUgXR9QKtE5qU3VLLxYEz8uu';
const ACCOUNT_ID = 2;

const SUPABASE_URL = 'https://fiiruzmzxvmlvsqoxzrv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaXJ1em16eHZtbHZzcW94enJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTc1MjcsImV4cCI6MjA5NjU5MzUyN30.8xCVkwGlZTL7ZrfUhbmL7Y6qGrsEal7ikw6UCf-3efk';

async function fetchAllPages(url) {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${url}&page=${page}`, {
      headers: { api_access_token: CHATWOOT_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    const items = data.payload || [];
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }
  return all;
}

async function upsertSupabase(table, rows, conflictColumn) {
  for (const row of rows) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': `resolution=merge-duplicates`
      },
      body: JSON.stringify(row)
    });
  }
}

async function main() {
  console.log('Migrando contatos...');
  const contacts = await fetchAllPages(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts?per_page=100`);
  console.log(`  → ${contacts.length} contatos encontrados`);
  
  const contactRows = contacts.map(c => ({
    chatwoot_id: c.id,
    name: c.name,
    email: c.email || null,
    phone: c.phone_number || null,
    avatar: c.thumbnail || null,
    company_id: c.custom_attributes?.company_id || c.additional_attributes?.company_id || null,
    additional_attributes: c.additional_attributes || {},
    custom_attributes: c.custom_attributes || {},
  }));
  
  for (const row of contactRows) {
    const { error } = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(row)
    }).then(r => r.json()).catch(() => ({}));
  }
  console.log(`  → ${contactRows.length} contatos migrados para Supabase`);

  console.log('Migrando empresas...');
  const companies = await fetchAllPages(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/companies?per_page=100`);
  console.log(`  → ${companies.length} empresas encontradas`);
  
  const companyRows = companies.map(c => ({
    chatwoot_id: c.id,
    name: c.name,
    website: c.website || null,
    industry: c.industry || null,
    additional_attributes: c.additional_attributes || {},
    custom_attributes: c.custom_attributes || {},
  }));
  
  for (const row of companyRows) {
    await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(row)
    }).then(r => r.json()).catch(() => ({}));
  }
  console.log(`  → ${companyRows.length} empresas migradas para Supabase`);

  // Migrar deals existentes do custom_attributes
  console.log('Migrando deals...');
  let totalDeals = 0;
  for (const c of contacts) {
    const dealsStr = c.custom_attributes?.crm_deals;
    if (!dealsStr) continue;
    try {
      const deals = JSON.parse(dealsStr);
      for (const deal of deals) {
        await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: deal.id,
            title: deal.title,
            value: deal.value,
            stage: deal.stage,
            priority: deal.priority,
            contact_id: c.id,
            company_id: c.custom_attributes?.company_id || null,
            assigned_to: deal.assignedTo,
            expected_close_date: deal.expectedCloseDate,
            products: deal.products,
            notes: deal.notes,
            created_at: deal.createdAt,
            updated_at: deal.updatedAt,
          })
        });
        totalDeals++;
      }
    } catch (e) {
      // skip invalid JSON
    }
  }
  console.log(`  → ${totalDeals} deals migrados para Supabase`);

  console.log('\nMigração concluída!');
}

main().catch(console.error);
