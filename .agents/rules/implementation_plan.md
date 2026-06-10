# Migração do CaenCRM: Supabase como Fonte Primária

Este plano detalha as etapas necessárias para migrar a fonte primária de dados do Chatwoot para o Supabase, garantindo que a aplicação fique mais rápida e independente, enquanto mantém a sincronização com o Chatwoot para as conversas.

## User Review Required

> [!WARNING]
> **RLS (Row Level Security) no Supabase**
> Atualmente, as tabelas `contacts` e `companies` possuem RLS habilitado, mas **não possuem políticas de acesso configuradas**. Isso significa que a chave `anon` do Supabase usada no frontend será bloqueada ao tentar ler ou escrever dados. Precisamos criar políticas (ex: permitindo leitura e escrita para todos temporariamente, ou atreladas a uma autenticação) antes que o frontend possa consultar o Supabase diretamente.

> [!IMPORTANT]
> **O Campo `chatwoot_id` no Supabase**
> O esquema atual no Supabase exige que `chatwoot_id` seja obrigatório (NOT NULL). No seu plano, a criação no Chatwoot passa a ser **opcional**. Para que possamos criar um contato apenas no Supabase, precisaremos alterar a coluna `chatwoot_id` no banco de dados para ser **NULLABLE**.

> [!CAUTION]
> **Identificadores (IDs)**
> Se criarmos contatos primeiro no Supabase, a navegação do sistema (ex: `/contact/{id}`) precisará usar o `id` interno do Supabase, não mais o `chatwoot_id`. Isso exigirá ajustes em todos os links e roteamentos, e precisaremos garantir que o relacionamento `company_id` nos contatos aponte para o `id` do Supabase da empresa (ou manter um mapeamento claro).

## Proposed Changes

### 1. Ajustes no Banco de Dados (Supabase)
Antes de alterar o código React, precisaremos rodar SQL no Supabase para:
- Tornar `chatwoot_id` nullable nas tabelas `contacts` e `companies`.
- Adicionar políticas RLS de `SELECT`, `INSERT`, `UPDATE` e `DELETE` para a role `anon` (ou `authenticated` se houver login).

### 2. Criação Dupla (Fase 1)
Atualizaremos os modais para priorizar o Supabase:

#### [MODIFY] `components/CreateContactModal.tsx`
- Inserir dados no Supabase (`supabase.from('contacts').insert()`).
- Se a opção de Chatwoot estiver marcada, fazer a chamada via `chatwootAPI.contacts.create()`, pegar o `id` retornado e fazer um `update` no Supabase com o `chatwoot_id`.

#### [MODIFY] `components/CreateCompanyModal.tsx`
- Mesma lógica: criar no Supabase, depois no Chatwoot (opcional), e sincronizar o `chatwoot_id`.

#### [MODIFY] `components/EditContactModal.tsx` / `EditCompanyModal.tsx`
- Atualizar no Supabase.
- Se o registro possuir `chatwoot_id`, atualizar também no Chatwoot.

### 3. Migração das Listas (Fase 2)
Substituir a leitura do Chatwoot pela leitura do Supabase:

#### [MODIFY] `components/Contacts.tsx`
- Trocar `useContacts` por `useContactsSupabase`.
- Remover a lógica de infinite scroll complexa baseada em paginação, adotando o formato simples ou paginação do Supabase (`.range()`).

#### [MODIFY] `components/Companies.tsx`
- Trocar `useCompanies` por `useCompaniesSupabase`.
- Ajustar os filtros e paginação.

### 4. Migração dos Detalhes (Fase 3)
Ajustar a visualização individual de contatos e empresas.

#### [NEW/MODIFY] `hooks/useContactDetailSupabase.ts` / `useCompanyDetailSupabase.ts`
- Criar hooks que buscam o contato/empresa pelo UUID do Supabase.
- No caso do contato, usar o `chatwoot_id` (se existir) para buscar as **conversas** do Chatwoot.
- No caso da empresa, usar o relacionamento do Supabase para listar os contatos de forma eficiente (`supabase.from('contacts').select('*').eq('company_id', companyId)`).

#### [MODIFY] `components/ContactDetail.tsx` / `CompanyDetail.tsx`
- Integrar os novos hooks.
- Corrigir a deleção (deletar do Supabase e, se tiver `chatwoot_id`, do Chatwoot).

### 5. Sincronização em Background (Fase 4)
Manter a sincronização, mas alterar sua direção ou comportamento.

#### [MODIFY] `api/sync.ts` / `hooks/useSyncToSupabase.ts`
- O sync atual que busca do Chatwoot e salva no Supabase deve continuar rodando a cada 5 minutos.
- Ele deve ser capaz de atrelar contatos importados aos registros existentes usando `email` ou `phone_number` para evitar duplicatas, caso o contato tenha sido criado direto no Supabase sem `chatwoot_id`.

### 6. Git e Deploy (Fase 0 e Fase 5)
Conforme solicitado:
- Inicializar Git se não existir.
- Salvar a versão final do plano na pasta `.agents/rules/`.
- Fazer o commit e push para o GitHub.

## Verification Plan

### Testes Manuais
- Criar um contato apenas no Supabase e verificar se aparece na lista instantaneamente.
- Criar um contato marcando para criar no Chatwoot também, e verificar se o `chatwoot_id` foi gravado corretamente.
- Acessar a página de detalhes de uma empresa e verificar se a lista de contatos vinculados carrega rápido e corretamente.
- Aguardar o ciclo de 5 minutos do sync para garantir que não sobrescreve ou duplica contatos criados no Supabase.
