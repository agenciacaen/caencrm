import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Kanban, Plus, Search, Loader2, Briefcase, Trash2, Edit3 } from 'lucide-react';
import { useDeals } from '../../hooks/useDeals';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../../types/deals';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import DealForm from './DealForm';

export default function DealsList() {
  const navigate = useNavigate();
  const { allDeals, loading, refresh, deleteDeal } = useDeals();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = search.trim()
    ? allDeals.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    : allDeals;

  const handleDelete = async (dealId: string) => {
    if (confirmDeleteId !== dealId) { setConfirmDeleteId(dealId); return; }
    try { await deleteDeal(dealId); } catch {}
    finally { setConfirmDeleteId(null); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Briefcase size={24} className="text-brand-500" />
            Negócios
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/deals')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Kanban size={16} />
            Kanban
          </button>
          <button
            onClick={() => refresh()}
            className="p-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest">
            <Plus size={16} />
            Novo Negócio
          </button>
        </div>
      </header>

      <div className="p-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar negócios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Carregando negócios..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nenhum negócio encontrado" />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-850">
                <tr>
                  <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Negócio</th>
                  <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Valor</th>
                  <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Estágio</th>
                  <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Prioridade</th>
                  <th className="text-right px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map(deal => (
                  <tr key={deal.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{deal.title}</span>
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black text-white ${DEAL_STAGE_COLORS[deal.stage]}`}>
                        {DEAL_STAGE_LABELS[deal.stage]}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <span className="text-slate-500">{deal.priority > 0 ? '★'.repeat(deal.priority) : '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditDeal(deal)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className={`p-2 rounded-lg transition-all ${
                            confirmDeleteId === deal.id
                              ? 'bg-red-500 text-white'
                              : 'text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DealForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={refresh} />
      <DealForm isOpen={!!editDeal} onClose={() => setEditDeal(null)} onSuccess={() => { setEditDeal(null); refresh(); }} editingDeal={editDeal} />
    </div>
  );
}
