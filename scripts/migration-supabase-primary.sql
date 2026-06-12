-- ============================================
-- Migration: Supabase como Fonte Primária
-- ============================================

-- 1. Tornar chatwoot_id nullable (criação opcional no Chatwoot)
ALTER TABLE public.contacts ALTER COLUMN chatwoot_id DROP NOT NULL;
ALTER TABLE public.companies ALTER COLUMN chatwoot_id DROP NOT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description text;

-- 2. Garantir índice único simples em chatwoot_id.
--    PostgreSQL permite múltiplos NULLs em UNIQUE e o Data API precisa de
--    um índice/constraint não parcial para upsert/onConflict funcionar.
BEGIN;
  ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_chatwoot_id_key;
  DROP INDEX IF EXISTS contacts_chatwoot_id_unique;
  CREATE UNIQUE INDEX IF NOT EXISTS contacts_chatwoot_id_unique ON public.contacts (chatwoot_id);
COMMIT;

BEGIN;
  ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_chatwoot_id_key;
  DROP INDEX IF EXISTS companies_chatwoot_id_unique;
  CREATE UNIQUE INDEX IF NOT EXISTS companies_chatwoot_id_unique ON public.companies (chatwoot_id);
COMMIT;

-- 2b. Escopo por conta Chatwoot
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS account_id text NOT NULL DEFAULT '';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS account_id text NOT NULL DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS account_id text NOT NULL DEFAULT '';

-- 3. Criar índices para busca por email (dedup no sync)
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts (phone) WHERE phone IS NOT NULL;

-- 4. RLS: permitir todas as operações para a role anon
--    (sistema single-user, sem autenticação ainda)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_contacts" ON public.contacts;
CREATE POLICY "allow_all_contacts" ON public.contacts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_companies" ON public.companies;
CREATE POLICY "allow_all_companies" ON public.companies
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_deals" ON public.deals;
CREATE POLICY "allow_all_deals" ON public.deals
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_leads" ON public.leads;
CREATE POLICY "allow_all_leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_products" ON public.products;
CREATE POLICY "allow_all_products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_deal_products" ON public.deal_products;
CREATE POLICY "allow_all_deal_products" ON public.deal_products
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Garantir acesso via Data API para anon/authenticated.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_products TO anon, authenticated;
