export type DealStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  priority: 0 | 1 | 2 | 3 | 4 | 5;
  contactId: number | null;
  companyId: number | null;
  conversationId: number | null;
  assignedTo: string | null;
  expectedCloseDate: string | null;
  products: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  prospecting: 'Prospecção',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed_won: 'Fechado (Ganho)',
  closed_lost: 'Fechado (Perdido)',
};

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  prospecting: 'bg-slate-500',
  qualification: 'bg-indigo-500',
  proposal: 'bg-pink-500',
  negotiation: 'bg-emerald-500',
  closed_won: 'bg-green-600',
  closed_lost: 'bg-red-500',
};
