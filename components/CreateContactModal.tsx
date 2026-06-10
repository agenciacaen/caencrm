import React, { useState, useEffect } from 'react';
import { X, Loader2, User, Mail, Phone, Plus, AlertCircle, Globe } from 'lucide-react';
import { supabase } from '../api/supabase';
import chatwootAPI from '../api/chatwoot';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [syncToChatwoot, setSyncToChatwoot] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPhoneNumber('');
      setSubmitError(null);
      setSyncToChatwoot(true);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Por favor, informe o nome do contato.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data: inserted, error: insertErr } = await supabase.from('contacts').insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phoneNumber.trim() || null,
      }).select().single();

      if (insertErr) throw insertErr;

      if (syncToChatwoot) {
        try {
          const chatwootContact = await chatwootAPI.contacts.create({
            name: name.trim(),
            email: email.trim() || undefined,
            phone_number: phoneNumber.trim() || undefined,
          });
          await supabase.from('contacts').update({ chatwoot_id: chatwootContact.id }).eq('id', (inserted as any).id);
        } catch (cwErr: any) {
          console.warn('Contato criado no Supabase, mas falha ao sincronizar com Chatwoot:', cwErr.message);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao cadastrar o contato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight">Novo Contato</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Cadastrar no Supabase</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Erro ao Cadastrar Contato</p>
                  <p className="text-[11px] opacity-90 mt-1">{submitError}</p>
                </div>
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User size={14} className="text-slate-300 dark:text-slate-500" /> Nome do Contato *
              </label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Mail size={14} className="text-slate-300 dark:text-slate-500" /> Email
              </label>
              <input
                type="email"
                placeholder="Ex: joao@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Phone size={14} className="text-slate-300 dark:text-slate-500" /> Telefone
              </label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-9999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Sync to Chatwoot toggle */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <button
                type="button"
                onClick={() => setSyncToChatwoot(!syncToChatwoot)}
                className={`w-10 h-6 rounded-full transition-all relative ${syncToChatwoot ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${syncToChatwoot ? 'left-5' : 'left-1'}`} />
              </button>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe size={14} className="text-slate-400" /> Sincronizar com Chatwoot
                </p>
                <p className="text-[10px] text-slate-500">Cria também no Chatwoot para usar nas conversas</p>
              </div>
            </div>

            {/* Footer / Submit */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Salvar Contato
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateContactModal;
