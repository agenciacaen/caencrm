# CaenCRM — Plano de Implementação

## Visão Geral
CRM B2B + B2C usando Chatwoot como banco de dados + API. Suporte a múltiplos canais (WhatsApp, Email, Instagram, Ligação). Gestão de negócios (Deals) vinculados a contatos ou empresas.

---

## Problemas Identificados

### Botões sem ação / navegação quebrada

| Arquivo | Linha | Botão | Problema |
|---------|-------|-------|----------|
| ConversationList.tsx | 64 | Filter icon | Sem onClick |
| ConversationList.tsx | 67 | ArrowUpDown icon | Sem onClick |
| ConversationList.tsx | 70 | ChevronsLeftRight icon | Sem onClick |
| ConversationDetail.tsx | 79 | MoreVertical icon | Sem onClick |
| ConversationDetail.tsx | 83 | User icon | Sem onClick |
| Contacts.tsx | 107 | Exportar | Sem onClick |
| Contacts.tsx | 111 | Novo Contato | Sem onClick |
| Contacts.tsx | 200 | Email div | cursor-pointer sem ação |
| Contacts.tsx | 206 | Phone div | cursor-pointer sem ação |
| Dashboard.tsx | 231 | Ver Relatório Completo | Sem onClick |
| CRMBoard.tsx | 903 | Ver Negociação | setSearchTerm em vez de navegar |

### Rotas faltantes
- `/deals` — Lista de negócios
- `/deals/board` — Kanban de negócios
- `/deals/:id` — Detalhe do negócio
- `/contacts/:id` — Detalhe do contato
- `/companies/:id` — Detalhe da empresa
- `/reports` — Relatório completo

---

## Arquitetura

### Rotas Finais
```
/dashboard          → Dashboard
/conversas          → Conversations
/deals              → DealsList (tabela)
/deals/board        → DealsKanban (board)
/deals/:id          → DealDetail (tela cheia)
/contatos           → ContactsList
/contatos/:id       → ContactDetail (com abas)
/empresas           → CompaniesList
/empresas/:id       → CompanyDetail (com abas)
/agente             → AIAgent
/agendamentos       → Appointments
/prospectar         → Prospecting
/importador         → BulkImport
/conexao            → Connection
/configuracoes      → SettingsView
/reports            → Reports (relatório completo)
```

### Sidebar
Substituir `/crm` (CRM) por `/deals` (Negócios) com ícone Kanban.

### Modelo de Dados — Deal

```typescript
type DealStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  priority: 0 | 1 | 2 | 3 | 4 | 5;
  contactId: number | null;    // B2C
  companyId: number | null;     // B2B
  conversationId: number | null;
  assignedTo: string | null;
  expectedCloseDate: string | null;
  products: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Armazenamento
Deals são armazenados em `custom_attributes["crm_deals"]` do Chatwoot:
- **B2C**: `contact.custom_attributes.crm_deals` = `JSON.stringify(Deal[])`
- **B2B**: `company.custom_attributes.crm_deals` = `JSON.stringify(Deal[])`

### Hook `useDeals`
- `getDeals(entity)` — parseia JSON de custom_attributes
- `createDeal(entity, deal)` — push + update API
- `updateDeal(entity, deal)` — map + update API
- `deleteDeal(entity, dealId)` — filter + update API
- `getAllDeals()` — varre contatos e empresas que têm crm_deals

---

## Fases de Implementação

### Fase 0: Tipos e Hooks
- [ ] Criar `types/deals.ts`
- [ ] Criar `hooks/useDeals.ts`

### Fase 1: Botões do Chat
- [ ] Filter dropdown em ConversationList (canal, status, não lidas)
- [ ] Sort toggle em ConversationList (recent/oldest/unread)
- [ ] Collapse sidebar em ConversationList
- [ ] MoreVertical menu em ConversationDetail (Vincular Negócio, Ver Contato, Atribuir)
- [ ] User icon navega para /contacts/:id

### Fase 2: Contacts + Dashboard
- [ ] CreateContactModal (Novo Contato)
- [ ] Export CSV (Exportar)
- [ ] Email → mailto: / Phone → clipboard
- [ ] "Ver Relatório Completo" → /reports
- [ ] "Ver Negociação" → /deals/:dealId

### Fase 3: Novas Rotas e Páginas
- [ ] Atualizar App.tsx com novas rotas
- [ ] Atualizar Sidebar (Negócios no lugar de CRM)
- [ ] ContactDetail.tsx (/contacts/:id)
- [ ] CompanyDetail.tsx (/companies/:id)
- [ ] DealsList.tsx (/deals)
- [ ] DealsKanban.tsx (/deals/board)
- [ ] DealDetail.tsx (/deals/:id)
- [ ] Reports.tsx (/reports)

### Fase 4: Multi-Channel
- [ ] Indicador de canal nas conversas (ícone por channel_type)
- [ ] Filtro por canal na ConversationList
- [ ] Badge de channel_type na página Connection

### Fase 5: Navegação Cruzada
- [ ] Toda entidade clicável navega para sua rota de detalhe
- [ ] Links entre Deal ↔ Contact ↔ Company ↔ Conversation

---

## Arquivos a criar

```
types/deals.ts                    — Tipos Deal, DealStage
hooks/useDeals.ts                 — Hook CRUD via custom_attributes
components/deals/DealsList.tsx    — Lista em tabela
components/deals/DealsKanban.tsx  — Board Kanban
components/deals/DealDetail.tsx   — Tela cheia
components/deals/DealForm.tsx     — Modal criar/editar
components/contacts/ContactDetail.tsx  — Perfil do contato
components/companies/CompanyDetail.tsx — Perfil da empresa
components/reports/Reports.tsx    — Relatório completo
components/CreateContactModal.tsx — Modal criar contato
```

---

## Regras

1. **Dead buttons first**: todo botão sem onClick ou com navegação quebrada deve ser resolvido antes de qualquer feature nova
2. **Custom attributes**: deals sempre em `custom_attributes["crm_deals"]` como JSON string
3. **Navegação**: usar `useNavigate()` do react-router-dom, nunca `window.location`
4. **Estilo**: manter Tailwind CSS via CDN, mesmo padrão de cores (slate-900 fundo, brand-500 destaque)
5. **Componentes reutilizáveis**: usar EmptyState, LoadingState, ErrorState de `components/ui/`
6. **Multi-canal**: respeitar `channel_type` do Chatwoot, exibir ícone e nome para cada tipo
