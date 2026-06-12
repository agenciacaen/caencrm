import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Search, Plus, Menu, FileDown, Mail, Phone, Loader2, Trash2, Edit3 } from 'lucide-react';
import { useContactsSupabase } from '../hooks/useContactsSupabase';
import { supabase } from '../api/supabase';
import chatwootAPI, { getAccountId } from '../api/chatwoot';
import EditContactModal from './EditContactModal';
import CreateContactModal from './CreateContactModal';
import EmptyState from './ui/EmptyState';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import { useMenuToggle } from '../contexts/MenuContext';
import { useToast } from '../contexts/ToastContext';
import type { ChatwootContact } from '../types/chatwoot';

const Contacts: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  const { success, error: toastError } = useToast();
  const { contacts, loading, error, refresh } = useContactsSupabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const q = searchTerm.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, searchTerm]);

  const handleEditClick = (contact: any) => {
    setSelectedContact(contact);
    setIsEditOpen(true);
  };

  const handleExportCSV = useCallback(() => {
    if (filteredContacts.length === 0) {
      toastError('Nenhum contato para exportar');
      return;
    }
    const headers = ['id', 'name', 'email', 'phone_number'];
    const rows = filteredContacts.map(c => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone_number || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Exportação concluída', `${filteredContacts.length} contatos exportados`);
  }, [filteredContacts, success, toastError]);

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success(`${label} copiado`, text);
    } catch {
      toastError('Erro ao copiar');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredContacts.map(c => c.supabase_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`Deseja realmente excluir permanentemente os ${selectedIds.length} contatos selecionados?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        const contact = contacts.find(c => c.supabase_id === id);
        const { error } = await supabase.from('contacts').delete().eq('id', id).eq('account_id', getAccountId());
        if (error) throw error;
        if (contact?.chatwoot_id) {
          try {
            await chatwootAPI.contacts.delete(contact.chatwoot_id);
          } catch (cwErr) {
            console.warn('Contato removido do Supabase, mas falha ao remover no Chatwoot:', cwErr);
          }
        }
      }
      setSelectedIds([]);
      refresh();
    } catch (err) {
      console.error('Erro na exclusão de contatos:', err);
      alert('Ocorreu um erro durante a exclusão.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-350">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Users size={24} className="text-brand-500" />
            Contatos
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <FileDown size={16} /> Exportar
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest">
            <Plus size={16} /> Novo Contato
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 no-scrollbar">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Filtrar por nome, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 text-slate-800 dark:text-slate-100 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState message="Carregando contatos..." />
          ) : error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : filteredContacts.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum contato encontrado" message="Os contatos aparecerão aqui." />
          ) : (
            <div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    <th className="px-6 py-5 w-12 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={filteredContacts.length > 0 && selectedIds.length === filteredContacts.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="text-left px-8 py-5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Identidade</th>
                    <th className="text-left px-8 py-5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Canais</th>
                    <th className="text-left px-8 py-5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="text-right px-8 py-5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {filteredContacts.map((c) => {
                    const isSelected = selectedIds.includes(c.supabase_id);
                    return (
                      <tr key={c.supabase_id} onClick={() => handleEditClick(c)} className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors cursor-pointer group ${isSelected ? 'bg-brand-50/10 dark:bg-brand-500/5' : ''}`}>
                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={isSelected} onChange={(e) => handleSelectOne(c.supabase_id, e.target.checked)}
                          />
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {c.thumbnail ? (
                              <img src={c.thumbnail} alt={c.name} className="w-10 h-10 rounded-2xl shadow-lg shadow-slate-900/10 object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-slate-800 flex items-center justify-center font-black text-white dark:text-slate-200 shadow-lg shadow-slate-900/10">
                                {c.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm group-hover:text-brand-600 transition-colors">{c.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{c.chatwoot_id ? `Chatwoot #${c.chatwoot_id}` : 'Apenas Supabase'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5 text-xs">
                            {c.email && (
                              <div onClick={(e) => { e.stopPropagation(); window.open(`mailto:${c.email}`); }} className="flex items-center gap-2.5 text-slate-500 hover:text-brand-600 transition-colors cursor-pointer">
                                <Mail size={14} className="text-slate-300 dark:text-slate-600" />
                                <span>{c.email}</span>
                              </div>
                            )}
                            {c.phone_number && (
                              <div onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(c.phone_number!, 'Telefone'); }} className="flex items-center gap-2.5 text-slate-500 hover:text-brand-600 transition-colors cursor-pointer">
                                <Phone size={14} className="text-slate-300 dark:text-slate-600" />
                                <span>{c.phone_number}</span>
                              </div>
                            )}
                            {!c.email && !c.phone_number && (
                              <span className="text-slate-400 dark:text-slate-550 italic">Sem contato</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            c.availability_status === 'online'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>{c.availability_status || 'offline'}</span>
                        </td>
                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleEditClick(c)} className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1.5">
                            <Edit3 size={13} className="shrink-0" /> <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-800 flex items-center gap-6 z-50 animate-fadeIn min-w-[340px] justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-black text-xs">{selectedIds.length}</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">Selecionados</p>
              <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">contatos marcados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds([])} className="px-4 py-2 hover:bg-slate-800 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-white transition-all" disabled={isDeleting}>Cancelar</button>
            <button onClick={handleDeleteSelected} disabled={isDeleting} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/10">
              {isDeleting ? <><Loader2 size={12} className="animate-spin shrink-0" /> Excluindo...</> : <><Trash2 size={12} className="shrink-0" /> Excluir Selecionados</>}
            </button>
          </div>
        </div>
      )}

      <CreateContactModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => refresh()} />
      <EditContactModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedContact(null); }} onSuccess={() => refresh()} contact={selectedContact} />
    </div>
  );
};

export default Contacts;
