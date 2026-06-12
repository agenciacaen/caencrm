import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, MessageSquare, Briefcase, Loader2, CornerUpLeft, Building2, Plus, Search, X, Check } from 'lucide-react';
import { getConversations, getAccountId, addContactToCompany } from '../../api/chatwoot';
import { supabase } from '../../api/supabase';
import type { ChatwootContact, ChatwootConversation, ChatwootCompany } from '../../types/chatwoot';
import { useDeals } from '../../hooks/useDeals';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import DealForm from '../deals/DealForm';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ChatwootContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversas' | 'negocios' | 'detalhes'>('negocios');
  const { getDealsForContact, allDeals } = useDeals();
  const [conversations, setConversations] = useState<ChatwootConversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [linkedCompany, setLinkedCompany] = useState<ChatwootCompany | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<ChatwootCompany[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    (async () => {
      const isNumericId = /^\d+$/.test(id);
      const accountId = getAccountId();
      const query = supabase.from('contacts').select('*').eq('account_id', accountId);
      const { data, error: err } = isNumericId
        ? await query.eq('chatwoot_id', Number(id)).single()
        : await query.eq('id', id).single();

        if (err || !data) { setError('Contato não encontrado'); return; }
        const d = data as any;
        const mappedContact = {
          id: d.chatwoot_id ?? -1,
          supabase_id: d.id,
          chatwoot_id: d.chatwoot_id,
          name: d.name,
          email: d.email || null,
          phone_number: d.phone || null,
          thumbnail: d.avatar || '',
          additional_attributes: (d.additional_attributes || {}) as Record<string, unknown>,
          custom_attributes: { ...(d.custom_attributes || {}), company_id: d.company_id } as Record<string, unknown>,
          identifier: null,
          created_at: 0,
          last_activity_at: null,
          availability_status: 'offline',
        } as ChatwootContact;
        setContact(mappedContact);
        if (d.company_id) {
          setCompanyLoading(true);
          try {
            const { data: compData } = await supabase.from('companies').select('*').eq('chatwoot_id', d.company_id).eq('account_id', getAccountId()).single();
              if (compData) {
                const cd = compData as any;
                setLinkedCompany({
                  id: cd.chatwoot_id ?? -1,
                  supabase_id: cd.id,
                  chatwoot_id: cd.chatwoot_id,
                  name: cd.name,
                  website: cd.website,
                  phone_number: cd.phone_number,
                  description: cd.description,
                  custom_attributes: cd.custom_attributes || {},
                  created_at: cd.created_at,
                  updated_at: cd.updated_at,
                });
              }
          } finally {
            setCompanyLoading(false);
          }
        }
    })().catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'conversas' || !id || !contact) return;
    setConvLoading(true);
    getConversations({ page: 1 })
      .then(res => {
        const all = (res as any).data?.payload || [];
        setConversations(all.filter((c: ChatwootConversation) => c.contact?.id === contact.id));
      })
      .catch(() => setConversations([]))
      .finally(() => setConvLoading(false));
  }, [activeTab, id, contact]);

  useEffect(() => {
    if (!isCompanyModalOpen) { setCompanyResults([]); setCompanySearch(''); return; }
    setCompanySearchLoading(true);
    (async () => {
      const { data, error: err } = await supabase.from('companies').select('*').eq('account_id', getAccountId()).order('name').limit(50);
      if (err) throw err;
        const list = (data || []).map((c: any) => ({
          id: c.chatwoot_id ?? -1,
          supabase_id: c.id,
          chatwoot_id: c.chatwoot_id,
          name: c.name,
          website: c.website,
          phone_number: c.phone_number,
          description: c.description,
          custom_attributes: c.custom_attributes || {},
          created_at: c.created_at,
          updated_at: c.updated_at,
        } as ChatwootCompany));
        if (companySearch.trim()) {
          const q = companySearch.toLowerCase();
          setCompanyResults(list.filter(c => c.name.toLowerCase().includes(q)));
        } else {
          setCompanyResults(list);
        }
    })().catch(() => setCompanyResults([])).finally(() => setCompanySearchLoading(false));
  }, [isCompanyModalOpen, companySearch]);

  const handleLinkCompany = async (company: ChatwootCompany) => {
    if (!contact) return;
    try {
      const companyChatwootId = (company as any).chatwoot_id ?? (company.id > 0 ? company.id : null);
      if (!companyChatwootId) return;
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ company_id: companyChatwootId })
        .eq('id', (contact as any).supabase_id || id)
        .eq('account_id', getAccountId());
      if (updateErr) throw updateErr;
      try {
        if (contact.id > 0) await addContactToCompany(companyChatwootId, contact.id);
      } catch (e) { console.warn('Falha ao vincular no Chatwoot:', e); }
      setLinkedCompany(company);
      setIsCompanyModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleUnlinkCompany = async () => {
    if (!contact) return;
    try {
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ company_id: null })
        .eq('id', (contact as any).supabase_id || id)
        .eq('account_id', getAccountId());
      if (updateErr) throw updateErr;
      setLinkedCompany(null);
    } catch (e) { console.error(e); }
  };

  if (loading) return <LoadingState message="Carregando contato..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!contact) return <EmptyState icon={User} title="Contato não encontrado" />;

  const contactDeals = allDeals.filter(d => d.contactId === contact.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            {contact.thumbnail ? (
              <img src={contact.thumbnail} alt={contact.name} className="w-10 h-10 rounded-2xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-black text-white">
                {contact.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 dark:text-white">{contact.name}</h1>
              <p className="text-xs text-slate-500">Contato Chatwoot</p>
            </div>
          </div>
        </div>
        <button onClick={() => setIsDealFormOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest">
          <Plus size={16} />
          Novo Negócio
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex gap-6 shrink-0">
        {(['negocios', 'conversas', 'detalhes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'negocios' ? 'Negócios' : tab === 'conversas' ? 'Conversas' : 'Detalhes'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'negocios' && (
          <div className="space-y-3">
            {contactDeals.length === 0 ? (
              <EmptyState icon={Briefcase} title="Nenhum negócio" message="Este contato ainda não tem negócios vinculados." />
            ) : (
              contactDeals.map(deal => (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{deal.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{deal.stage}</p>
                    </div>
                    <span className="font-black text-emerald-600">{deal.value}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'conversas' && (
          <div className="space-y-3">
            {convLoading ? (
              <LoadingState message="Carregando conversas..." />
            ) : conversations.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Nenhuma conversa" message="Este contato ainda não possui conversas." />
            ) : (
              conversations.map(conv => {
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const isOutgoing = lastMsg?.message_type === 1;
                return (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/conversas`, { state: { selectedConvId: conv.id } })}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">#{conv.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        conv.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
                        conv.status === 'resolved' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      }`}>{conv.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {isOutgoing && <CornerUpLeft size={10} className="shrink-0" />}
                      {lastMsg?.content || 'Nenhuma mensagem'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(conv.last_activity_at * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'detalhes' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</p>
                {linkedCompany ? (
                  <button onClick={handleUnlinkCompany} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">Desvincular</button>
                ) : (
                  <button onClick={() => setIsCompanyModalOpen(true)} className="text-[10px] text-brand-600 hover:text-brand-700 font-bold uppercase tracking-wider">Vincular</button>
                )}
              </div>
              {companyLoading ? (
                <Loader2 size={14} className="animate-spin text-slate-400" />
              ) : linkedCompany ? (
                <button onClick={() => navigate(`/empresas/${(linkedCompany as any).supabase_id || linkedCompany.id}`)} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-left">
                  <Building2 size={16} className="text-brand-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{linkedCompany.name}</p>
                    {linkedCompany.website && <p className="text-[10px] text-slate-500">{linkedCompany.website}</p>}
                  </div>
                </button>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhuma empresa vinculada</p>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <DetailRow label="Email" value={contact.email} />
              <DetailRow label="Telefone" value={contact.phone_number} />
              <DetailRow label="Status" value={contact.availability_status} />
            </div>
          </div>
        )}
      </div>

      <DealForm
        isOpen={isDealFormOpen}
        onClose={() => setIsDealFormOpen(false)}
        onSuccess={() => {}}
        preselectedContactId={contact?.id && contact.id > 0 ? contact.id : undefined}
        preselectedCompanyId={linkedCompany?.id && linkedCompany.id > 0 ? linkedCompany.id : undefined}
      />

      {/* Company Selector Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Vincular Empresa</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
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
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {companySearchLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-500" size={20} /></div>
              ) : companyResults.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Nenhuma empresa encontrada</p>
              ) : (
                companyResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkCompany(c)}
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
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value || '—'}</span>
    </div>
  );
}
