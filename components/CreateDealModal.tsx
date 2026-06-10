import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, User, Inbox, Plus, AlertCircle } from 'lucide-react';
import chatwootAPI from '../api/chatwoot';
import type { ChatwootContact, ChatwootInbox } from '../types/chatwoot';

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialStage?: string;
}

const CreateDealModal: React.FC<CreateDealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStage = 'novo-lead',
}) => {
  const [contacts, setContacts] = useState<ChatwootContact[]>([]);
  const [inboxes, setInboxes] = useState<ChatwootInbox[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Form states
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [dealValue, setDealValue] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>(initialStage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData();
      setSelectedStage(initialStage);
      setSelectedContactId('');
      setDealValue('');
      setSubmitError(null);
    }
  }, [isOpen, initialStage]);

  const fetchRequiredData = async () => {
    setLoadingData(true);
    setErrorData(null);
    try {
      const [contactsRes, inboxesRes] = await Promise.all([
        chatwootAPI.contacts.get(),
        chatwootAPI.inboxes.get(),
      ]);

      const fetchedContacts = contactsRes?.payload || [];
      const fetchedInboxes = inboxesRes?.payload || [];

      setContacts(fetchedContacts);
      setInboxes(fetchedInboxes);

      // Pre-select first inbox if available
      if (fetchedInboxes.length > 0) {
        setSelectedInboxId(String(fetchedInboxes[0].id));
      }
    } catch (err) {
      setErrorData('Erro ao carregar contatos ou canais do Chatwoot.');
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !selectedInboxId) {
      setSubmitError('Por favor, selecione um contato e um canal.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Criar conversa no Chatwoot
      const conversation = await chatwootAPI.conversations.create({
        inbox_id: Number(selectedInboxId),
        contact_id: Number(selectedContactId),
        status: 'open',
        custom_attributes: {
          deal_value: dealValue ? parseFloat(dealValue).toFixed(2) : '0.00',
        },
      });

      if (!conversation || !conversation.id) {
        throw new Error('Falha ao criar conversa na API.');
      }

      // 2. Adicionar Label do Funil de Vendas correspondente ao estágio
      if (selectedStage) {
        await chatwootAPI.conversations.addLabels(conversation.id, [selectedStage]);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao criar a negociação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">Criar Oportunidade</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Vincular lead ao Chatwoot</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Loader2 className="animate-spin mb-3 text-brand-500" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando dados do Chatwoot...</p>
            </div>
          ) : errorData ? (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Erro de Carregamento</p>
                <p className="text-[11px] opacity-90 mt-1">{errorData}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Erro ao Criar Negociação</p>
                    <p className="text-[11px] opacity-90 mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Contato */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={14} className="text-slate-300 dark:text-slate-600" /> Contato do Chatwoot *
                </label>
                {contacts.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[11px] font-semibold">
                    Nenhum contato encontrado no Chatwoot. Por favor, crie um contato primeiro no painel ou no CRM.
                  </div>
                ) : (
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    required
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <option value="" className="dark:bg-slate-900">Selecione um contato...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">
                        {c.name} {c.email ? `(${c.email})` : c.phone_number ? `(${c.phone_number})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Canal / Inbox */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Inbox size={14} className="text-slate-300 dark:text-slate-600" /> Canal de Atendimento (Inbox) *
                </label>
                {inboxes.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-[11px] font-semibold">
                    Nenhum canal ativo encontrado no Chatwoot.
                  </div>
                ) : (
                  <select
                    value={selectedInboxId}
                    onChange={(e) => setSelectedInboxId(e.target.value)}
                    required
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                  >
                    {inboxes.map((ib) => (
                      <option key={ib.id} value={ib.id} className="dark:bg-slate-900">
                        {ib.name} ({ib.channel_type.replace('Channel::', '')})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Estágio do Funil */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Estágio Inicial do Funil
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'novo-lead', label: 'Novo Lead' },
                    { id: 'qualificacao', label: 'Qualificação IA' },
                    { id: 'proposta', label: 'Proposta Enviada' },
                    { id: 'negociacao', label: 'Negociação' },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setSelectedStage(stage.id)}
                      className={`p-3.5 border text-[11px] font-bold rounded-2xl transition-all ${
                        selectedStage === stage.id
                          ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50/50 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor da Negociação */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-300" dark:className="text-slate-600" /> Valor da Oportunidade (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5000.00"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                />
              </div>

              {/* Footer / Submit */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || contacts.length === 0 || inboxes.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-brand-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Criar Negociação
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateDealModal;
