import React, { useState, useEffect } from 'react';
import { X, Loader2, Building2, Globe, Phone, FileText, Plus, AlertCircle, User, CheckCircle2, Search, ArrowRight, Link2, Users } from 'lucide-react';
import { supabase } from '../api/supabase';
import chatwootAPI, { getAccountId } from '../api/chatwoot';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function fallbackId(id: string): number {
  const parsed = parseInt(id.replace(/\D/g, '').slice(0, 8), 10);
  return Number.isFinite(parsed) ? -parsed : -1;
}

interface ExistingContact {
  id: string;
  supabase_id: string;
  chatwoot_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: number | null;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [syncToChatwoot, setSyncToChatwoot] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [companySupabaseId, setCompanySupabaseId] = useState<string | null>(null);
  const [companyChatwootId, setCompanyChatwootId] = useState<number | null>(null);

  const [step, setStep] = useState<'company' | 'contact'>('company');
  const [contactMode, setContactMode] = useState<'select' | 'create'>('create');

  // Existing contact selection
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<ExistingContact[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);
  const [selectedExistingContact, setSelectedExistingContact] = useState<ExistingContact | null>(null);
  const [linkingContact, setLinkingContact] = useState(false);

  // New contact creation
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactCreated, setContactCreated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setWebsite('');
      setPhoneNumber('');
      setDescription('');
      setSubmitError(null);
      setStep('company');
      setContactMode('create');
      setCompanySupabaseId(null);
      setCompanyChatwootId(null);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactSubmitting(false);
      setContactError(null);
      setContactCreated(false);
      setContactSearch('');
      setContactResults([]);
      setSelectedExistingContact(null);
      setLinkingContact(false);
      setSyncToChatwoot(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== 'contact' || contactMode !== 'select') return;
    const load = async () => {
      setContactSearchLoading(true);
      try {
        const accountId = getAccountId();
        let query = supabase.from('contacts').select('id,name,email,phone,company_id,chatwoot_id').eq('account_id', accountId);
        if (contactSearch.trim()) query = query.ilike('name', `%${contactSearch}%`);
        const { data } = await query.order('name').limit(50);
        setContactResults((data || []).map((c: any) => ({
          id: c.id,
          supabase_id: c.id,
          chatwoot_id: c.chatwoot_id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company_id: c.company_id,
        })));
      } catch { setContactResults([]); }
      finally { setContactSearchLoading(false); }
    };
    load();
  }, [contactSearch, isOpen, step, contactMode]);

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Por favor, informe o nome da empresa.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: inserted, error: insertErr } = await supabase.from('companies').insert({
        name: name.trim(),
        website: website.trim() || null,
        phone_number: phoneNumber.trim() || null,
        description: description.trim() || null,
        account_id: getAccountId(),
      }).select().single();

      if (insertErr) throw insertErr;
      setCompanySupabaseId((inserted as any).id);

      if (syncToChatwoot) {
        try {
          const company = await chatwootAPI.companies.create({
            name: name.trim(),
            website: website.trim() || undefined,
            phone_number: phoneNumber.trim() || undefined,
            description: description.trim() || undefined,
          });
          if (company?.id) {
            setCompanyChatwootId(company.id);
            const { error: updateErr } = await supabase
              .from('companies')
              .update({ chatwoot_id: company.id })
              .eq('id', (inserted as any).id)
              .eq('account_id', getAccountId());
            if (updateErr) throw updateErr;
          }
        } catch (cwErr: any) {
          console.warn('Empresa criada no Supabase, mas falha ao sincronizar com Chatwoot:', cwErr.message);
        }
      }

      onSuccess();
      setStep('contact');
    } catch (err: any) {
      setSubmitError(err.message || 'Erro inesperado ao cadastrar a empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkExistingContact = async () => {
    if (!selectedExistingContact || !companySupabaseId) return;
    setLinkingContact(true);
    setContactError(null);
    try {
      const companyNumericId = companyChatwootId ?? fallbackId(companySupabaseId);
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ company_id: companyNumericId })
        .eq('id', selectedExistingContact.supabase_id)
        .eq('account_id', getAccountId());
      if (updateErr) throw updateErr;

      if (selectedExistingContact.chatwoot_id && companyChatwootId) {
        try {
          await chatwootAPI.companies.addContact(companyChatwootId, selectedExistingContact.chatwoot_id);
        } catch (cwErr: any) {
          console.warn('Contato vinculado no Supabase, mas falha ao sincronizar vínculo com Chatwoot:', cwErr.message);
        }
      }

      setContactCreated(true);
    } catch (err: any) {
      setContactError(err.message || 'Erro ao vincular contato.');
    } finally {
      setLinkingContact(false);
    }
  };

  const handleAddContact = async () => {
    if (!companyChatwootId && !companySupabaseId) return;
    if (!contactName.trim()) {
      setContactError('Informe o nome do contato.');
      return;
    }
    setContactSubmitting(true);
    setContactError(null);
    try {
      const companyNumericId = companyChatwootId ?? fallbackId(companySupabaseId!);
      const { data: inserted, error: insertErr } = await supabase.from('contacts').insert({
        name: contactName.trim(),
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        company_id: companyNumericId,
        account_id: getAccountId(),
      }).select('id').single();
      if (insertErr) throw insertErr;

      if (companyChatwootId && syncToChatwoot) {
        try {
          const res = await chatwootAPI.contacts.create({
            name: contactName.trim(),
            email: contactEmail.trim() || undefined,
            phone_number: contactPhone.trim() || undefined,
            custom_attributes: { company_id: companyChatwootId },
          });
          const contactId = (res as any)?.payload?.contact?.id || (res as any)?.payload?.id || (res as any)?.id;
          if (contactId) {
            const { error: updateErr } = await supabase
              .from('contacts')
              .update({ chatwoot_id: contactId })
              .eq('id', (inserted as any).id)
              .eq('account_id', getAccountId());
            if (updateErr) throw updateErr;
            await chatwootAPI.companies.addContact(companyChatwootId, contactId);
          }
        } catch (cwErr: any) {
          console.warn('Contato criado no Supabase, mas falha ao sincronizar com Chatwoot:', cwErr.message);
        }
      }
      setContactCreated(true);
    } catch (err: any) {
      setContactError(err.message || 'Erro ao adicionar contato.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleSkipContact = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight">
              {step === 'company' ? 'Nova Empresa' : 'Vincular Contato'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {step === 'company' ? 'Cadastrar no Supabase' : 'Vincule um contato à empresa'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {(['company', 'contact'] as const).map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              step === s ? 'bg-brand-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              <span className="w-4 h-4 rounded-full bg-current text-transparent flex items-center justify-center text-[8px] font-black">
                {step === s ? (s === 'contact' && contactCreated ? '✓' : i + 1) : '✓'}
              </span>
              {s === 'company' ? 'Empresa' : 'Contato'}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* STEP 1: Company Form */}
          {step === 'company' && (
            <form onSubmit={handleSubmitCompany} className="space-y-5">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Erro ao Cadastrar Empresa</p>
                    <p className="text-[11px] opacity-90 mt-1">{submitError}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-300 dark:text-slate-500" /> Nome da Empresa *
                </label>
                <input type="text" placeholder="Ex: Google Brasil" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe size={14} className="text-slate-300 dark:text-slate-500" /> Website
                </label>
                <input type="text" placeholder="Ex: google.com.br" value={website} onChange={(e) => setWebsite(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-300 dark:text-slate-500" /> Telefone
                </label>
                <input type="text" placeholder="Ex: (11) 99999-9999" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-300 dark:text-slate-500" /> Descrição da Empresa
                </label>
                <textarea placeholder="Detalhes ou observações sobre a empresa..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-600 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>

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

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
                <button type="button" onClick={onClose} className="px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting || !name.trim()} className="flex items-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest">
                  {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Cadastrando...</> : <><Plus size={16} /> Salvar Empresa</>}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Link Contact */}
          {step === 'contact' && (
            <div className="space-y-5">
              {contactCreated ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white text-base">
                      {selectedExistingContact ? 'Contato Vinculado!' : 'Contato Adicionado!'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">O contato foi vinculado à empresa com sucesso.</p>
                  </div>
                  <button onClick={onClose} className="px-8 py-3 bg-brand-500 text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-brand-600 transition-all uppercase tracking-widest">
                    Concluir
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-200 dark:border-brand-800">
                    <Building2 size={20} className="text-brand-500 shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Empresa criada {companyChatwootId ? `• ID #${companyChatwootId}` : '(apenas Supabase)'}</p>
                    </div>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      onClick={() => { setContactMode('select'); setSelectedExistingContact(null); setContactSearch(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                        contactMode === 'select'
                          ? 'bg-brand-500 text-slate-950'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Users size={14} /> Selecionar
                    </button>
                    <button
                      onClick={() => { setContactMode('create'); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                        contactMode === 'create'
                          ? 'bg-brand-500 text-slate-950'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Plus size={14} /> Criar Novo
                    </button>
                  </div>

                  {/* Select existing contact */}
                  {contactMode === 'select' && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500">Busque e selecione um contato existente</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Buscar contatos..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {contactSearchLoading ? (
                          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand-500" size={18} /></div>
                        ) : contactResults.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4 font-semibold">Nenhum contato encontrado</p>
                        ) : (
                          contactResults.map(c => (
                            <button
                              key={c.supabase_id}
                              type="button"
                              onClick={() => setSelectedExistingContact(
                                selectedExistingContact?.supabase_id === c.supabase_id ? null : c
                              )}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${
                                selectedExistingContact?.supabase_id === c.supabase_id
                                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                                {c.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                                {c.email && <p className="text-[10px] text-slate-500 truncate">{c.email}</p>}
                              </div>
                              {selectedExistingContact?.supabase_id === c.supabase_id && (
                                <CheckCircle2 size={16} className="text-brand-500 shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                      {selectedExistingContact && (
                        <button
                          onClick={handleLinkExistingContact}
                          disabled={linkingContact}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-brand-600 transition-all disabled:opacity-50 uppercase tracking-widest"
                        >
                          {linkingContact ? <><Loader2 className="animate-spin" size={16} /> Vinculando...</> : <><Link2 size={16} /> Vincular Contato</>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Create new contact */}
                  {contactMode === 'create' && (
                    <>
                      {contactError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-100 dark:border-red-800 text-[10px] text-red-600 dark:text-red-400 font-bold">{contactError}</div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <User size={14} /> Nome do Contato *
                        </label>
                        <input type="text" placeholder="Ex: João Silva" value={contactName} onChange={(e) => setContactName(e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                          <input type="email" placeholder="joao@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                          <input type="text" placeholder="(11) 99999-9999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400" />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
                    <button onClick={handleSkipContact} className="px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      Pular
                    </button>
                    {contactMode === 'create' && (
                      <button onClick={handleAddContact} disabled={contactSubmitting || !contactName.trim()} className="flex items-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-brand-600 transition-all disabled:opacity-50 uppercase tracking-widest">
                        {contactSubmitting ? <><Loader2 className="animate-spin" size={16} /> Adicionando...</> : <><User size={16} /> Adicionar Contato</>}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCompanyModal;
