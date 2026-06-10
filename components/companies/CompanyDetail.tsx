import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Users, Briefcase, Loader2, Mail, Phone as PhoneIcon } from 'lucide-react';
import { supabase } from '../../api/supabase';
import type { ChatwootCompany, ChatwootContact } from '../../types/chatwoot';
import { useDeals } from '../../hooks/useDeals';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<ChatwootCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contatos' | 'negocios' | 'detalhes'>('negocios');
  const { allDeals } = useDeals();
  const [contacts, setContacts] = useState<ChatwootContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('companies').select('*').eq('chatwoot_id', Number(id)).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Empresa não encontrada'); return; }
        const d = data as any;
        setCompany({
          id: d.chatwoot_id,
          name: d.name,
          website: d.website,
          phone_number: d.phone_number,
          description: d.description,
          custom_attributes: d.custom_attributes || {},
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'contatos' || !id || !company) return;
    setContactsLoading(true);
    supabase.from('contacts').select('*').eq('company_id', Number(id)).order('name')
      .then(({ data }) => {
        setContacts((data || []).map((c: any) => ({
          id: c.chatwoot_id,
          name: c.name,
          email: c.email || null,
          phone_number: c.phone || null,
          thumbnail: c.avatar || '',
          additional_attributes: (c.additional_attributes || {}) as Record<string, unknown>,
          custom_attributes: { ...(c.custom_attributes || {}), company_id: c.company_id } as Record<string, unknown>,
          identifier: null,
          created_at: 0,
          last_activity_at: null,
          availability_status: 'offline',
        } as ChatwootContact)));
      })
      .catch(() => setContacts([]))
      .finally(() => setContactsLoading(false));
  }, [activeTab, id, company]);

  if (loading) return <LoadingState message="Carregando empresa..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!company) return <EmptyState icon={Building2} title="Empresa não encontrada" />;

  const companyDeals = allDeals.filter(d => d.companyId === company.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center font-black text-white">
            {company.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-white">{company.name}</h1>
            <p className="text-xs text-slate-500">Empresa</p>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex gap-6 shrink-0">
        {(['negocios', 'contatos', 'detalhes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'negocios' ? 'Negócios' : tab === 'contatos' ? 'Contatos' : 'Detalhes'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'negocios' && (
          <div className="space-y-3">
            {companyDeals.length === 0 ? (
              <EmptyState icon={Briefcase} title="Nenhum negócio" message="Esta empresa ainda não tem negócios vinculados." />
            ) : (
              companyDeals.map(deal => (
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

        {activeTab === 'contatos' && (
          <div className="space-y-3">
            {contactsLoading ? (
              <LoadingState message="Carregando contatos..." />
            ) : contacts.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum contato" message="Nenhum contato vinculado a esta empresa." />
            ) : (
              contacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => navigate(`/contatos/${contact.id}`)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{contact.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        {contact.email && <span className="flex items-center gap-1"><Mail size={10} />{contact.email}</span>}
                        {contact.phone_number && <span className="flex items-center gap-1"><PhoneIcon size={10} />{contact.phone_number}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'detalhes' && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <DetailRow label="Website" value={company.website} />
            <DetailRow label="Telefone" value={company.phone_number} />
            <DetailRow label="Descrição" value={company.description} />
          </div>
        )}
      </div>
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
