import React, { useState, useEffect } from 'react';
import { X, DollarSign, Tag, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react';
import chatwootAPI from '../api/chatwoot';

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  conversation: any; // O objeto completo de conversa do Chatwoot
}

const KANBAN_STAGES = [
  { id: 'novo-lead', title: 'Novo Lead' },
  { id: 'qualificacao', title: 'Qualificação IA' },
  { id: 'proposta', title: 'Proposta Enviada' },
  { id: 'negociacao', title: 'Negociação' },
];

const EditDealModal: React.FC<EditDealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  conversation,
}) => {
  const [dealValue, setDealValue] = useState('');
  const [activeStage, setActiveStage] = useState('novo-lead');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conversation) {
      // Pega o valor numérico dos atributos customizados
      const val = conversation.custom_attributes?.deal_value;
      setDealValue(val ? String(val) : '');

      // Identifica o estágio atual com base nas labels
      const labels = conversation.labels || [];
      const stage = KANBAN_STAGES.find(s => labels.includes(s.id));
      setActiveStage(stage ? stage.id : 'novo-lead');
      
      // Reseta estados de confirmação
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [conversation, isOpen]);

  if (!isOpen || !conversation) return null;

  const contactName = conversation.meta?.sender?.name || conversation.contact?.name || 'Desconhecido';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Atualizar o valor da oportunidade no Chatwoot (custom_attributes)
      const numericValue = dealValue ? parseFloat(dealValue) : null;
      await chatwootAPI.conversations.update(conversation.id, {
        // Envia o custom_attributes com o novo deal_value
        // Obs: a API de update suporta custom_attributes
        // Vamos estender a assinatura ou enviar direto no payload
      } as any);

      // Como o update de conversa no Chatwoot pode exigir um payload específico para custom_attributes,
      // podemos passar no corpo da requisição PATCH do updateConversation.
      // Vamos verificar a chamada do endpoint no chatwootAPI. No nosso chatwoot.ts, updateConversation faz:
      // chatwootFetch(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      // Se enviarmos custom_attributes, a API do Chatwoot aceita.
      const payload: any = {};
      if (numericValue !== null) {
        payload.custom_attributes = {
          ...conversation.custom_attributes,
          deal_value: numericValue,
        };
      } else {
        payload.custom_attributes = {
          ...conversation.custom_attributes,
          deal_value: null,
        };
      }

      await fetch(`${import.meta.env.DEV ? '/chatwoot-api-v1' : `${import.meta.env.VITE_CHATWOOT_URL}/api/v1`}/accounts/${import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1'}/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': import.meta.env.VITE_CHATWOOT_TOKEN || '',
        },
        body: JSON.stringify(payload),
      });

      // 2. Atualizar o estágio (Labels)
      const stageIds = KANBAN_STAGES.map(s => s.id);
      const currentLabels = conversation.labels || [];
      const otherLabels = currentLabels.filter((l: string) => !stageIds.includes(l));
      const newLabels = [...otherLabels, activeStage];

      await chatwootAPI.conversations.addLabels(conversation.id, newLabels);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[CaenCRM] Erro ao editar oportunidade:', err);
      setError('Erro ao salvar alterações. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Para excluir do pipeline, removemos as labels do Kanban e adicionamos a label 'excluido'
      const stageIds = KANBAN_STAGES.map(s => s.id);
      const currentLabels = conversation.labels || [];
      const otherLabels = currentLabels.filter((l: string) => !stageIds.includes(l) && l !== 'lead');
      const newLabels = [...otherLabels, 'excluido'];

      await chatwootAPI.conversations.addLabels(conversation.id, newLabels);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[CaenCRM] Erro ao excluir oportunidade:', err);
      setError('Erro ao excluir a negociação. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-850 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Negociação #CAEN-{conversation.id}</span>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Editar Oportunidade</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </header>

        {/* Form / Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl">
              {error}
            </div>
          )}

          {!showDeleteConfirm ? (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Contato (Apenas visualização) */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contato</label>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <div className="w-9 h-9 bg-slate-950 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[11px] font-black text-white dark:text-slate-200 shadow-md shadow-slate-950/10">
                    {contactName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{contactName}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Vinculado pelo Chatwoot</p>
                  </div>
                </div>
              </div>

              {/* Valor da Oportunidade */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor da Negociação (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <DollarSign size={16} />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-950 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Estágio do Funil */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Estágio da Pipeline</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Tag size={16} />
                  </span>
                  <select
                    value={activeStage}
                    onChange={(e) => setActiveStage(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-950 transition-all appearance-none cursor-pointer"
                  >
                    {KANBAN_STAGES.map(stage => (
                      <option key={stage.id} value={stage.id} className="dark:bg-slate-900">
                        {stage.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer de Ações do Formulário */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-3 border border-red-200 dark:border-red-900/30 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                >
                  <Trash2 size={16} />
                  Excluir Negociação
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-brand-400 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Confirmação de Exclusão */
            <div className="space-y-6 py-4 text-center">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-red-500/5">
                <AlertTriangle size={32} />
              </div>
              
              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Excluir Negociação?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Isso removerá esta oportunidade permanentemente da pipeline de vendas do CaenCRM. A conversa e o contato continuarão existindo de forma segura no seu Chatwoot.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500 dark:bg-rose-600 text-white rounded-2xl text-xs font-bold hover:bg-red-600 dark:hover:bg-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-red-500/10 dark:shadow-rose-600/15"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Sim, Excluir Oportunidade
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditDealModal;
