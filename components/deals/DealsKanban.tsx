import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutList, Plus, Loader2, Briefcase } from 'lucide-react';
import { useDeals } from '../../hooks/useDeals';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DealStage } from '../../types/deals';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';

const KANBAN_STAGES: DealStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export default function DealsKanban() {
  const navigate = useNavigate();
  const { allDeals, loading, updateDeal } = useDeals();

  const handleDragStart = (e: React.DragEvent, dealId: string, sourceStage: DealStage) => {
    e.dataTransfer.setData('dealId', dealId);
    e.dataTransfer.setData('sourceStage', sourceStage);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    const sourceStage = e.dataTransfer.getData('sourceStage') as DealStage;
    if (!dealId || sourceStage === targetStage) return;

    await updateDeal(dealId, { stage: targetStage });
  };

  const columns = KANBAN_STAGES.map(stage => ({
    stage,
    label: DEAL_STAGE_LABELS[stage],
    color: DEAL_STAGE_COLORS[stage],
    deals: allDeals.filter(d => d.stage === stage),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Briefcase size={24} className="text-brand-500" />
            Pipeline de Negócios
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/deals')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <LayoutList size={16} />
            Lista
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <LoadingState message="Carregando pipeline..." />
        ) : allDeals.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nenhum negócio no pipeline" message="Crie um novo negócio para começar." />
        ) : (
          <div className="flex gap-6 min-h-full items-start">
            {columns.map(col => (
              <div
                key={col.stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.stage)}
                className="w-72 shrink-0 bg-slate-100 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{col.label}</h3>
                  <span className="text-[10px] bg-white dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-black ml-auto">{col.deals.length}</span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {col.deals.map(deal => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id, deal.stage)}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 shadow-sm cursor-pointer active:cursor-grabbing transition-all"
                    >
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">{deal.title}</h4>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                        </span>
                        {deal.priority > 0 && (
                          <span className="text-amber-400 text-[10px]">{'★'.repeat(deal.priority)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
