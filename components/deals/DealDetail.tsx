import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, User, Building2, MessageSquare, Edit3, Trash2, Loader2 } from 'lucide-react';
import { useDeals } from '../../hooks/useDeals';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../../types/deals';
import EmptyState from '../ui/EmptyState';
import DealForm from './DealForm';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allDeals, deleteDeal } = useDeals();
  const deal = allDeals.find(d => d.id === id);
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!deal) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <EmptyState icon={Briefcase} title="Negócio não encontrado" />
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteDeal(deal.id);
      navigate('/deals', { replace: true });
    } catch { setDeleting(false); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-white">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${DEAL_STAGE_COLORS[deal.stage]}`}>
                {DEAL_STAGE_LABELS[deal.stage]}
              </span>
              {deal.priority > 0 && (
                <span className="text-amber-400 text-[10px]">{'★'.repeat(deal.priority)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all"
          >
            <Edit3 size={14} />
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              confirmDelete
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800'
            }`}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirmDelete ? 'Confirmar?' : 'Excluir'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {deal.contactId && (
            <button
              onClick={() => navigate(`/contatos/${deal.contactId}`)}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 transition-all text-left"
            >
              <User size={18} className="text-brand-500 mb-2" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">#{deal.contactId}</p>
            </button>
          )}
          {deal.companyId && (
            <button
              onClick={() => navigate(`/empresas/${deal.companyId}`)}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 transition-all text-left"
            >
              <Building2 size={18} className="text-brand-500 mb-2" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">#{deal.companyId}</p>
            </button>
          )}
          {deal.conversationId && (
            <button
              onClick={() => navigate(`/conversas`)}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 transition-all text-left"
            >
              <MessageSquare size={18} className="text-brand-500 mb-2" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversa</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">#{deal.conversationId}</p>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-widest">Detalhes</h3>
          <DetailRow label="Produtos" value={deal.products || '—'} />
          <DetailRow label="Data Prevista" value={deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR') : '—'} />
          <DetailRow label="Criado em" value={new Date(deal.createdAt).toLocaleDateString('pt-BR')} />
          <DetailRow label="Atualizado em" value={new Date(deal.updatedAt).toLocaleDateString('pt-BR')} />
          {deal.notes && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}
        </div>
      </div>

      <DealForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={() => { setShowEditForm(false); }}
        editingDeal={deal}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
