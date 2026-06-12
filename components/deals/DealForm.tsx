import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Building2, User, DollarSign, Briefcase, Star, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../api/supabase';
import type { ChatwootCompany, ChatwootContact } from '../../types/chatwoot';
import type { Deal } from '../../types/deals';
import chatwootAPI, { getAccountId } from '../../api/chatwoot';
import { useDeals } from '../../hooks/useDeals';
import { DealStage, DEAL_STAGE_LABELS } from '../../types/deals';

interface DealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCompanyId?: number;
  preselectedContactId?: number;
  editingDeal?: Deal | null;
}

const STAGES: { value: DealStage; label: string }[] = Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => ({
  value: value as DealStage,
  label,
}));

function fallbackId(id: string): number {
  const parsed = parseInt(id.replace(/\D/g, '').slice(0, 8), 10);
  return Number.isFinite(parsed) ? -parsed : -1;
}

function mapCompany(c: any): ChatwootCompany {
  return {
    id: c.chatwoot_id ?? fallbackId(c.id),
    supabase_id: c.id,
    chatwoot_id: c.chatwoot_id,
    name: c.name,
    website: c.website,
    phone_number: c.phone_number,
    description: c.description,
    custom_attributes: c.custom_attributes || {},
    created_at: c.created_at,
    updated_at: c.updated_at,
  } as ChatwootCompany;
}

function mapContact(c: any): ChatwootContact {
  return {
    id: c.chatwoot_id ?? fallbackId(c.id),
    supabase_id: c.id,
    chatwoot_id: c.chatwoot_id,
    name: c.name,
    email: c.email,
    phone_number: c.phone,
    thumbnail: c.avatar || '',
    custom_attributes: { ...(c.custom_attributes || {}), company_id: c.company_id },
    additional_attributes: c.additional_attributes || {},
    identifier: null,
    created_at: Math.floor(new Date(c.created_at).getTime() / 1000),
    last_activity_at: null,
    availability_status: 'offline',
  } as ChatwootContact;
}

export default function DealForm({ isOpen, onClose, onSuccess, preselectedCompanyId, preselectedContactId, editingDeal }: DealFormProps) {
  const { createDeal, updateDeal, deleteDeal } = useDeals();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<DealStage>('prospecting');
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<ChatwootCompany | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<ChatwootCompany[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  const [selectedContact, setSelectedContact] = useState<ChatwootContact | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<ChatwootContact[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const companyRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const isEditing = !!editingDeal;

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
      setError('');
      setConfirmDelete(false);
      return;
    }

    if (editingDeal) {
      setTitle(editingDeal.title);
      setValue(editingDeal.value > 0 ? String(editingDeal.value) : '');
      setStage(editingDeal.stage);
      setPriority(editingDeal.priority);
      setNotes(editingDeal.notes || '');
      if (editingDeal.companyId) {
        (async () => {
          const accountId = getAccountId();
          const { data } = await supabase.from('companies').select('*').eq('chatwoot_id', editingDeal.companyId).eq('account_id', accountId).maybeSingle();
          if (data) { setSelectedCompany(mapCompany(data)); } else {
            const byFallback = await supabase.from('companies').select('*').eq('account_id', accountId).order('created_at');
            if (byFallback.data) {
              const match = byFallback.data.find((c: any) => (c.chatwoot_id ?? fallbackId(c.id)) === editingDeal.companyId);
              if (match) setSelectedCompany(mapCompany(match));
            }
          }
        })().catch(() => {});
      }
      if (editingDeal.contactId) {
        (async () => {
          const accountId = getAccountId();
          const { data } = await supabase.from('contacts').select('*').eq('chatwoot_id', editingDeal.contactId).eq('account_id', accountId).maybeSingle();
          if (data) { setSelectedContact(mapContact(data)); } else {
            const byFallback = await supabase.from('contacts').select('*').eq('account_id', accountId).order('created_at');
            if (byFallback.data) {
              const match = byFallback.data.find((c: any) => (c.chatwoot_id ?? fallbackId(c.id)) === editingDeal.contactId);
              if (match) setSelectedContact(mapContact(match));
            }
          }
        })().catch(() => {});
      }
      return;
    }

    if (preselectedCompanyId) {
      (async () => {
        const accountId = getAccountId();
        const { data } = await supabase.from('companies').select('*').eq('chatwoot_id', preselectedCompanyId).eq('account_id', accountId).single();
        if (data) { setSelectedCompany(mapCompany(data)); }
      })().catch(() => {});
    }
    if (preselectedContactId) {
      (async () => {
        const accountId = getAccountId();
        const { data } = await supabase.from('contacts').select('*').eq('chatwoot_id', preselectedContactId).eq('account_id', accountId).single();
        if (data) setSelectedContact(mapContact(data));
      })().catch(() => {});
    }
  }, [isOpen, editingDeal, preselectedCompanyId, preselectedContactId]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setCompanySearchLoading(true);
      try {
        const accountId = getAccountId();
        if (!companySearch.trim()) {
          const { data } = await supabase.from('companies').select('*').eq('account_id', accountId).order('name').limit(50);
          setCompanyResults((data || []).map(mapCompany));
        } else {
          const { data } = await supabase.from('companies').select('*').eq('account_id', accountId).ilike('name', `%${companySearch}%`).order('name').limit(50);
          setCompanyResults((data || []).map(mapCompany));
        }
      } catch { setCompanyResults([]); }
      finally { setCompanySearchLoading(false); }
    };
    load();
  }, [companySearch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setContactSearchLoading(true);
      try {
        const accountId = getAccountId();
        let query = supabase.from('contacts').select('*').eq('account_id', accountId);
        if (contactSearch.trim()) query = query.ilike('name', `%${contactSearch}%`);
        const { data } = await query.order('name').limit(50);
        setContactResults((data || []).map(mapContact));
      } catch { setContactResults([]); }
      finally { setContactSearchLoading(false); }
    };
    load();
  }, [contactSearch, isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setContactOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) { setError('Informe o título do negócio.'); return; }
    if (!editingDeal && !selectedCompany) { setError('Selecione uma empresa.'); return; }
    setSaving(true);
    setError('');
    try {
      const data = {
        title: title.trim(),
        value: parseFloat(value) || 0,
        stage,
        priority: priority as 0 | 1 | 2 | 3 | 4 | 5,
        contactId: selectedContact?.id ?? null,
        companyId: isEditing ? (selectedCompany?.id ?? editingDeal.companyId) : selectedCompany!.id,
        conversationId: editingDeal?.conversationId ?? null,
        assignedTo: editingDeal?.assignedTo ?? null,
        expectedCloseDate: editingDeal?.expectedCloseDate ?? null,
        products: editingDeal?.products ?? null,
        notes: notes.trim() || null,
        accountId: getAccountId(),
      };
      if (isEditing && editingDeal) {
        await updateDeal(editingDeal.id, data);
      } else {
        await createDeal(data as any);
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar negócio.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCompany = async () => {
    const name = companySearch.trim();
    if (!name || creatingCompany) return;
    setCreatingCompany(true);
    try {
      const { data: inserted, error: insertErr } = await supabase.from('companies').insert({
        name,
        account_id: getAccountId(),
      }).select().single();
      if (insertErr) throw insertErr;
      const mapped = mapCompany(inserted);
      try {
        const cwCompany = await chatwootAPI.companies.create({ name });
        if (cwCompany?.id) {
          (mapped as any).chatwoot_id = cwCompany.id;
          (mapped as any).id = cwCompany.id;
          await supabase.from('companies').update({ chatwoot_id: cwCompany.id }).eq('id', (inserted as any).id).eq('account_id', getAccountId());
        }
      } catch { /* Chatwoot sync optional */ }
      setSelectedCompany(mapped);
      setCompanyOpen(false);
      setCompanySearch('');
    } catch (e: any) {
      setError(e.message || 'Erro ao criar empresa.');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleDelete = async () => {
    if (!editingDeal) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteDeal(editingDeal.id);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir negócio.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase size={18} className="text-brand-500" />
            {isEditing ? 'Editar Negócio' : 'Novo Negócio'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div ref={companyRef}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
              <Building2 size={14} /> Empresa {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={selectedCompany ? selectedCompany.name : companySearch}
                onFocus={() => { setCompanyOpen(true); if (selectedCompany) { setCompanySearch(''); setSelectedCompany(null); } }}
                onChange={(e) => { setCompanySearch(e.target.value); setCompanyOpen(true); }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
              {companyOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {companySearchLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-500" size={18} /></div>
                  ) : (
                    <>
                      {companyResults.length === 0 && !creatingCompany && (
                        <p className="text-xs text-slate-400 text-center py-4 font-semibold">Nenhuma empresa encontrada</p>
                      )}
                      {companyResults.map(c => (
                        <button
                          key={(c as any).supabase_id || c.id}
                          type="button"
                          onClick={() => { setSelectedCompany(c); setCompanyOpen(false); setCompanySearch(''); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-xs font-black text-white shrink-0">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                            {c.website && <p className="text-[10px] text-slate-500 truncate">{c.website}</p>}
                          </div>
                        </button>
                      ))}
                      {companySearch.trim() && (
                        <button
                          type="button"
                          onClick={handleCreateCompany}
                          disabled={creatingCompany}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-xs font-black text-slate-950 shrink-0">
                            <Plus size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {creatingCompany ? (
                              <span className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
                                <Loader2 size={14} className="animate-spin" /> Criando...
                              </span>
                            ) : (
                              <>
                                <p className="font-bold text-xs text-brand-600 dark:text-brand-400">Criar "{companySearch.trim()}"</p>
                                <p className="text-[10px] text-slate-500">Nova empresa</p>
                              </>
                            )}
                          </div>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div ref={contactRef}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
              <User size={14} /> Contato <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Buscar contato..."
                value={selectedContact ? selectedContact.name : contactSearch}
                onFocus={() => { setContactOpen(true); if (selectedContact) { setContactSearch(''); setSelectedContact(null); } }}
                onChange={(e) => { setContactSearch(e.target.value); setContactOpen(true); }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
              {contactOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedContact(null); setContactOpen(false); setContactSearch(''); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left text-slate-400"
                  >
                    <span className="text-xs font-semibold">Nenhum contato</span>
                  </button>
                  {contactSearchLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-500" size={18} /></div>
                  ) : (
                    contactResults.map(c => (
                      <button
                        key={(c as any).supabase_id || c.id}
                        type="button"
                        onClick={() => { setSelectedContact(c); setContactOpen(false); setContactSearch(''); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-left"
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
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

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
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
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
                  type="button"
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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
              <span className="text-red-500">•</span> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  confirmDelete
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800'
                }`}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {confirmDelete ? 'Confirma Excluir?' : 'Excluir'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Negócio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
