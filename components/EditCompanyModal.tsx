import React, { useState, useEffect } from 'react';
import { X, Loader2, Building2, Globe, Phone, FileText, Trash2, AlertTriangle, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../api/supabase';
import chatwootAPI from '../api/chatwoot';
import type { ChatwootCompany } from '../types/chatwoot';
import type { CRMCompany } from '../hooks/useCompaniesSupabase';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: (ChatwootCompany | CRMCompany) | null;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
}) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && company) {
      setName(company.name || '');
      setWebsite(company.website || '');
      setPhoneNumber(company.phone_number || '');
      setDescription(company.description || '');
      setSubmitError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!name.trim()) {
      setSubmitError('Por favor, informe o nome da empresa.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const supabaseId = (company as CRMCompany).supabase_id;
      const chatwootId = (company as CRMCompany).chatwoot_id ?? (company.id > 0 ? company.id : null);

      const update = supabase.from('companies').update({
        name: name.trim(),
        website: website.trim() || null,
        phone_number: phoneNumber.trim() || null,
        description: description.trim() || null,
      });
      const { error: updateErr } = supabaseId
        ? await update.eq('id', supabaseId)
        : await update.eq('chatwoot_id', company.id);
      if (updateErr) throw updateErr;

      if (chatwootId) {
        try {
          await chatwootAPI.companies.update(chatwootId, {
            name: name.trim(),
            website: website.trim() || undefined,
            phone_number: phoneNumber.trim() || undefined,
            description: description.trim() || undefined,
          });
        } catch (cwErr: any) {
          console.warn('Empresa atualizada no Supabase, mas falha ao atualizar no Chatwoot:', cwErr.message);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao atualizar a empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    setIsDeleting(true);
    setSubmitError(null);

    try {
      const supabaseId = (company as CRMCompany).supabase_id;
      const chatwootId = (company as CRMCompany).chatwoot_id ?? (company.id > 0 ? company.id : null);
      const deletion = supabase.from('companies').delete();
      const { error: deleteErr } = supabaseId
        ? await deletion.eq('id', supabaseId)
        : await deletion.eq('chatwoot_id', company.id);
      if (deleteErr) throw deleteErr;

      if (chatwootId) {
        try {
          await chatwootAPI.companies.delete(chatwootId);
        } catch (cwErr: any) {
          console.warn('Empresa excluída do Supabase, mas falha ao excluir do Chatwoot:', cwErr.message);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao excluir a empresa.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight">Editar Empresa</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Código da Empresa: #{company.id}</p>
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
          {showDeleteConfirm ? (
            <div className="p-6 bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-3xl space-y-4 animate-scale-up text-center">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Confirmar Exclusão?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                  Você está prestes a excluir **{company.name}** permanentemente do sistema. Esta ação não poderá ser desfeita.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-extrabold text-xs rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {isDeleting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Excluir de Vez
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Erro ao Salvar Alterações</p>
                    <p className="text-[11px] opacity-90 mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Nome da Empresa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-300 dark:text-slate-500" /> Nome da Empresa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Google Brasil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe size={14} className="text-slate-300 dark:text-slate-500" /> Website
                </label>
                <input
                  type="text"
                  placeholder="Ex: google.com.br"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
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

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-300 dark:text-slate-500" /> Descrição da Empresa
                </label>
                <textarea
                  placeholder="Detalhes ou observações sobre a empresa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Footer / Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-3 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all uppercase tracking-widest"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
                <div className="flex gap-3">
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
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditCompanyModal;
