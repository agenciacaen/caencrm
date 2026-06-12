import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutList, Plus, Loader2, Briefcase, Trash2 } from 'lucide-react';
import { useDeals } from '../../hooks/useDeals';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DealStage } from '../../types/deals';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import DealForm from './DealForm';

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
  const { allDeals, loading, updateDeal, deleteDeal, refresh } = useDeals();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = async (dealId: string) => {
    if (confirmDeleteId !== dealId) { setConfirmDeleteId(dealId); return; }
    setDeletingId(dealId);
    try { await deleteDeal(dealId); } catch {}
    finally { setDeletingId(null); setConfirmDeleteId(null); }
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
            onClick={() => navigate('/deals/list')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <LayoutList size={16} />
            Lista
          </button>
          <button onClick={() => refresh()} className="p-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest">
            <Plus size={16} />
            Novo Negócio
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
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/deals/${deal.id}`)}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                          disabled={deletingId === deal.id}
                          className={`shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                            confirmDeleteId === deal.id
                              ? 'bg-red-500 text-white'
                              : 'text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                          }`}
                        >
                          {deletingId === deal.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                      {confirmDeleteId === deal.id && (
                        <p className="text-[9px] text-red-500 font-bold mt-2">Clique na lixeira novamente para confirmar</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DealForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={refresh} />
    </div>
  );
}
