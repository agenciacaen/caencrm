import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Building2, User, DollarSign, Briefcase, Star } from 'lucide-react';
import { supabase } from '../../api/supabase';
import type { ChatwootCompany, ChatwootContact } from '../../types/chatwoot';
import { useDeals } from '../../hooks/useDeals';
import { DealStage, DEAL_STAGE_LABELS } from '../../types/deals';

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCompanyId?: number;
  preselectedContactId?: number;
}

const STAGES: { value: DealStage; label: string }[] = Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => ({
  value: value as DealStage,
  label,
}));

export default function DealForm({ isOpen, onClose, onSuccess, preselectedCompanyId, preselectedContactId }: DealFormProps) {
  const { createDeal } = useDeals();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<DealStage>('prospecting');
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Company state
  const [selectedCompany, setSelectedCompany] = useState<ChatwootCompany | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<ChatwootCompany[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);

  // Contact state
  const [selectedContact, setSelectedContact] = useState<ChatwootContact | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<ChatwootContact[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);

  const [step, setStep] = useState<'company' | 'contact' | 'details'>('company');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setValue('');
      setStage('prospecting');
      setPriority(0);
      setNotes('');
      setSelectedCompany(null);
      setSelectedContact(null);
      setCompanySearch('');
      setContactSearch('');
      setStep('company');
      setError('');
      return;
    }
    if (preselectedCompanyId) {
      supabase.from('companies').select('*').eq('chatwoot_id', preselectedCompanyId).single().then(({ data }) => {
        if (data) { setSelectedCompany({ id: (data as any).chatwoot_id, name: (data as any).name, website: (data as any).website } as ChatwootCompany); setStep('contact'); }
      }).catch(() => {});
    }
    if (preselectedContactId) {
      supabase.from('contacts').select('*').eq('chatwoot_id', preselectedContactId).single().then(({ data }) => {
        if (data) {
          const d = data as any;
          setSelectedContact({ id: d.chatwoot_id, name: d.name, email: d.email, phone_number: d.phone, additional_attributes: {}, custom_attributes: { company_id: d.company_id }, availability_status: null } as ChatwootContact);
        }
      }).catch(() => {});
    }
  }, [isOpen, preselectedCompanyId, preselectedContactId]);

  // Company search from Supabase
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setCompanySearchLoading(true);
      try {
        if (!companySearch.trim()) {
          const { data } = await supabase.from('companies').select('*').order('name').limit(50);
          setCompanyResults((data || []).map((c: any) => ({ id: c.chatwoot_id, name: c.name, website: c.website } as ChatwootCompany)));
        } else {
          const { data } = await supabase.from('companies').select('*').ilike('name', `%${companySearch}%`).order('name').limit(50);
          setCompanyResults((data || []).map((c: any) => ({ id: c.chatwoot_id, name: c.name, website: c.website } as ChatwootCompany)));
        }
      } catch { setCompanyResults([]); }
      finally { setCompanySearchLoading(false); }
    };
    load();
  }, [companySearch, isOpen]);

  // Contact search from Supabase – filtered by company if selected
  useEffect(() => {
    if (!isOpen || step !== 'contact') return;
    const load = async () => {
      setContactSearchLoading(true);
      try {
        let query = supabase.from('contacts').select('*');
        if (contactSearch.trim()) {
          query = query.ilike('name', `%${contactSearch}%`);
        }
        if (selectedCompany) {
          query = query.eq('company_id', selectedCompany.id);
        }
        const { data } = await query.order('name').limit(50);
        setContactResults((data || []).map((c: any) => ({
          id: c.chatwoot_id,
          name: c.name,
          email: c.email,
          phone_number: c.phone,
          thumbnail: c.avatar,
          custom_attributes: { company_id: c.company_id },
          additional_attributes: {},
          availability_status: null,
        } as ChatwootContact)));
      } catch { setContactResults([]); }
      finally { setContactSearchLoading(false); }
    };
    load();
  }, [contactSearch, isOpen, step, selectedCompany]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Informe o título do negócio.'); return; }
    setSaving(true);
    setError('');
    try {
      await createDeal({
        title: title.trim(),
        value: parseFloat(value) || 0,
        stage,
        priority: priority as 0 | 1 | 2 | 3 | 4 | 5,
        contactId: selectedContact?.id || null,
        companyId: selectedCompany?.id || null,
        conversationId: null,
        assignedTo: null,
        expectedCloseDate: null,
        products: null,
        notes: notes.trim() || null,
      });
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao criar negócio.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase size={18} className="text-brand-500" />
            Novo Negócio
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {(['company', 'contact', 'details'] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => { if (s === 'company' || selectedCompany) setStep(s); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                step === s
                  ? 'bg-brand-500 text-slate-950'
                  : (s === 'company' || (s === 'contact' && selectedCompany) || (s === 'details' && selectedContact))
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer'
                  : 'bg-slate-50 dark:bg-slate-850 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-current text-transparent flex items-center justify-center text-[8px] font-black">
                {step === s ? '✓' : i + 1}
              </span>
              {s === 'company' ? 'Empresa' : s === 'contact' ? 'Contato' : 'Detalhes'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'company' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500">Selecione a empresa (opcional)</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar empresas..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {selectedCompany && (
                  <div className="flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
                    <div className="flex items-center gap-3">
                      <Building2 size={16} className="text-brand-500" />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedCompany.name}</span>
                    </div>
                    <button onClick={() => setSelectedCompany(null)} className="text-red-500 hover:text-red-600"><X size={14} /></button>
                  </div>
                )}
                {companySearchLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-500" size={20} /></div>
                ) : (
                  companyResults.filter(c => !selectedCompany || c.id !== selectedCompany.id).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCompany(c); setContactSearch(''); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        {c.website && <p className="text-[10px] text-slate-500 truncate">{c.website}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={async () => {
                  if (selectedCompany) {
                    try {
                      const { data } = await supabase.from('contacts').select('*').eq('company_id', selectedCompany.id);
                      const companyContacts = (data || []).map((c: any) => ({
                        id: c.chatwoot_id, name: c.name, email: c.email, phone_number: c.phone,
                        additional_attributes: {}, custom_attributes: { company_id: c.company_id },
                        availability_status: null,
                      } as ChatwootContact));
                      if (companyContacts.length === 1) {
                        setSelectedContact(companyContacts[0]);
                        setStep('details');
                        return;
                      }
                    } catch {}
                  }
                  setStep('contact');
                }} className="px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all">Próximo</button>
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500">
                Selecione o contato
                {selectedCompany && <span className="text-slate-400 font-normal"> (apenas contatos de <span className="font-bold">{selectedCompany.name}</span>)</span>}
              </p>
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
              <div className="max-h-60 overflow-y-auto space-y-1">
                {selectedContact && (
                  <div className="flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-brand-500" />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedContact.name}</span>
                    </div>
                    <button onClick={() => setSelectedContact(null)} className="text-red-500 hover:text-red-600"><X size={14} /></button>
                  </div>
                )}
                {contactSearchLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-500" size={20} /></div>
                ) : (
                  contactResults.filter(c => !selectedContact || c.id !== selectedContact.id).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        {c.email && <p className="text-[10px] text-slate-500 truncate">{c.email}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep('company')} className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold">Voltar</button>
                <button onClick={() => { if (selectedContact) setStep('details'); }} disabled={!selectedContact} className="px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all disabled:opacity-50">Próximo</button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-500">Preencha os detalhes do negócio</p>

              {/* Selected entities summary */}
              <div className="flex gap-2 pb-2">
                {selectedCompany && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <Building2 size={12} /> {selectedCompany.name}
                  </span>
                )}
                {selectedContact && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <User size={12} /> {selectedContact.name}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Título do Negócio</label>
                <input
                  type="text"
                  placeholder="Ex: Consultoria de Marketing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="number"
                      placeholder="0,00"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Estágio</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as DealStage)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none"
                  >
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Prioridade</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setPriority(priority === n ? 0 : n)}
                      className={`p-2 rounded-lg transition-all ${priority >= n ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      <Star size={16} fill={priority >= n ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Observações</label>
                <textarea
                  placeholder="Observações sobre o negócio..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-[10px] text-red-600 dark:text-red-400 font-bold">{error}</div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep('contact')} className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold">Voltar</button>
                <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Salvando...' : 'Criar Negócio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
