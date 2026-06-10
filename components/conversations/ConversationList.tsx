import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronsLeftRight, Menu, Loader2, MessageSquare, CornerUpLeft, Wifi, WifiOff, Check, X, MessageCircle, Mail, Phone, Send } from 'lucide-react';
import type { ChatwootConversation, ChatwootInbox } from '../../types/chatwoot';
import { WsConnectionStatus } from '../../hooks/useChatwootSocket';
import { formatRelativeTime } from './utils';
import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';

interface ConversationListProps {
  conversations: ChatwootConversation[];
  loading: boolean;
  error: string | null;
  selectedConvId: number | null;
  onSelectConversation: (id: number) => void;
  inboxes: ChatwootInbox[];
  selectedInboxId: number | null;
  onSelectInbox: (id: number | null) => void;
  assigneeType: 'me' | 'unassigned' | 'all';
  onChangeAssigneeType: (type: 'me' | 'unassigned' | 'all') => void;
  wsStatus: WsConnectionStatus;
  mineCount: number;
  unassignedCount: number;
  allCount: number;
  onMenuToggle: () => void;
  sortOrder: 'recent' | 'oldest' | 'unread';
  onSortChange: (order: 'recent' | 'oldest' | 'unread') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onlyUnread: boolean;
  onOnlyUnreadChange: (v: boolean) => void;
}

const SORT_LABELS: Record<string, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  unread: 'Não lidos primeiro',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  'Channel::Whatsapp': <MessageCircle size={14} />,
  'Channel::Api': <MessageCircle size={14} />,
  'Channel::Email': <Mail size={14} />,
  'Channel::Instagram': <MessageSquare size={14} />,
  'Channel::Twilio SMS': <MessageSquare size={14} />,
  'Channel::Telegram': <Send size={14} />,
};

const DEFAULT_CHANNEL_ICON = <MessageSquare size={14} />;

export default function ConversationList({
  conversations, loading, error, selectedConvId, onSelectConversation,
  inboxes, selectedInboxId, onSelectInbox,
  assigneeType, onChangeAssigneeType,
  wsStatus, mineCount, unassignedCount, allCount,
  onMenuToggle, sortOrder, onSortChange, isCollapsed, onToggleCollapse,
  searchTerm, onSearchChange, onlyUnread, onOnlyUnreadChange,
}: ConversationListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const inboxMap = useMemo(() => {
    const map = new Map<number, ChatwootInbox>();
    inboxes.forEach(inbox => map.set(inbox.id, inbox));
    return map;
  }, [inboxes]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterOpen]);

  const cycleSort = () => {
    const next: Record<string, 'recent' | 'oldest' | 'unread'> = {
      recent: 'oldest',
      oldest: 'unread',
      unread: 'recent',
    };
    onSortChange(next[sortOrder]);
  };

  const filteredInboxes = inboxes.filter(inbox => {
    const convCount = conversations.filter(c => c.inbox_id === inbox.id).length;
    return convCount > 0;
  });

  if (isCollapsed) {
    return (
      <div className="flex w-0 lg:w-10 flex-col bg-[#151718] border-r border-[#222526] shrink-0 overflow-hidden items-center pt-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-[#222526] rounded-md text-[#889096] hover:text-[#eceef0] transition-colors"
          title="Expandir lista"
        >
          <ChevronsLeftRight size={14} className="rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex w-full lg:w-[320px] flex-col bg-[#151718] border-r border-[#222526] shrink-0 ${selectedConvId ? 'hidden lg:flex' : 'flex'}`}>
      {/* Mobile Header */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-[#222526] lg:hidden bg-[#151718]">
        <button onClick={onMenuToggle} className="p-2 hover:bg-[#222526] rounded-lg text-[#889096] hover:text-[#eceef0]">
          <Menu size={18} />
        </button>
        <h2 className="font-bold text-sm text-[#eceef0]">Conversas</h2>
      </div>

      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#222526] bg-[#151718] flex flex-col gap-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-[#eceef0]">Conversas</h2>
            <span className="bg-[#1c1e1f] border border-[#2e3234] text-[#c1c8cd] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Abertas
            </span>
            <span title={wsStatus === 'connected' ? 'Tempo real' : wsStatus === 'connecting' ? 'Conectando...' : 'Offline'}>
              {wsStatus === 'connected' ? (
                <Wifi size={10} className="text-emerald-400" />
              ) : wsStatus === 'connecting' ? (
                <Loader2 size={10} className="animate-spin text-amber-400" />
              ) : (
                <WifiOff size={10} className="text-red-400" />
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-1.5 hover:bg-[#222526] rounded-md transition-colors ${isFilterOpen || onlyUnread ? 'text-[#0091ff] bg-[#222526]' : 'text-[#889096] hover:text-[#eceef0]'}`}
                title="Filtrar conversas"
              >
                <Filter size={14} />
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-8 w-56 bg-[#1c1e1f] border border-[#2e3234] rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-fadeIn">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#687076] mb-2">Filtrar por</p>

                  {/* Channels */}
                  {filteredInboxes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[#687076] uppercase tracking-wider">Canal</p>
                      {filteredInboxes.map(inbox => (
                        <label key={inbox.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#222526] rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-[#2e3234] text-[#0091ff] focus:ring-[#0091ff]/30 bg-[#0f1112] cursor-pointer"
                            checked={selectedInboxId === inbox.id}
                            onChange={() => onSelectInbox(selectedInboxId === inbox.id ? null : inbox.id)}
                          />
                          <span className="text-[#889096]">{CHANNEL_ICONS[inbox.channel_type] || DEFAULT_CHANNEL_ICON}</span>
                          <span className="text-xs font-bold text-[#eceef0]">{inbox.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-[#222526] pt-2">
                    <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#222526] rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-[#2e3234] text-[#0091ff] focus:ring-[#0091ff]/30 bg-[#0f1112] cursor-pointer"
                        checked={onlyUnread}
                        onChange={(e) => onOnlyUnreadChange(e.target.checked)}
                      />
                      <span className="text-xs font-bold text-[#eceef0]">Só não lidas</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={cycleSort}
              className={`p-1.5 hover:bg-[#222526] rounded-md transition-colors relative group ${sortOrder !== 'recent' ? 'text-[#0091ff] bg-[#222526]' : 'text-[#889096] hover:text-[#eceef0]'}`}
              title={SORT_LABELS[sortOrder]}
            >
              <ArrowUpDown size={14} />
              {sortOrder !== 'recent' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#0091ff] rounded-full border border-[#151718]" />
              )}
              <div className="absolute right-0 top-8 bg-[#1c1e1f] border border-[#2e3234] rounded-lg shadow-xl z-50 px-2.5 py-1.5 hidden group-hover:block whitespace-nowrap">
                <span className="text-[10px] font-bold text-[#eceef0]">{SORT_LABELS[sortOrder]}</span>
              </div>
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-[#222526] rounded-md text-[#889096] hover:text-[#eceef0] transition-colors"
              title="Recolher lista"
            >
              <ChevronsLeftRight size={14} />
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687076]" size={13} />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0f1112] border border-[#222526] rounded-lg text-xs text-[#eceef0] placeholder-[#687076] focus:outline-none focus:border-[#0091ff] transition-all"
          />
        </div>

        {/* Inbox Filter */}
        {inboxes.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
            <button
              onClick={() => onSelectInbox(null)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all border ${
                selectedInboxId === null
                  ? 'bg-[#1c1e1f] border-[#2e3234] text-[#eceef0]'
                  : 'bg-transparent border-transparent text-[#889096] hover:text-[#eceef0]'
              }`}
            >
              Todos Canais
            </button>
            {inboxes.map((inbox) => (
              <button
                key={inbox.id}
                onClick={() => onSelectInbox(inbox.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all border ${
                  selectedInboxId === inbox.id
                    ? 'bg-[#1c1e1f] border-[#2e3234] text-[#eceef0]'
                    : 'bg-transparent border-transparent text-[#889096] hover:text-[#eceef0]'
                }`}
              >
                <span className="opacity-60">{CHANNEL_ICONS[inbox.channel_type] || DEFAULT_CHANNEL_ICON}</span>
                {inbox.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#222526] -mx-4 px-4 pt-1">
          {(['me', 'unassigned', 'all'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChangeAssigneeType(type)}
              className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${
                assigneeType === type
                  ? 'border-[#0091ff] text-[#eceef0]'
                  : 'border-transparent text-[#889096] hover:text-[#eceef0]'
              }`}
            >
              {type === 'me' ? 'Minhas' : type === 'unassigned' ? 'Não atribuídas' : 'Todos'}
              <span className="text-[10px] opacity-75 ml-0.5">
                ({type === 'me' ? mineCount : type === 'unassigned' ? unassignedCount : allCount})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <LoadingState message="Carregando conversas..." compact />
        ) : error ? (
          <ErrorState message={error} compact />
        ) : conversations.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sem conversas" compact />
        ) : (
          conversations.map((c) => {
            const contactName = c.meta?.sender?.name || c.contact?.name || 'Desconhecido';
            const initial = contactName.substring(0, 2).toUpperCase();
            const lastMsgObj = c.messages?.[c.messages.length - 1];
            const lastMessage = lastMsgObj?.content || 'Nenhuma mensagem';
            const isOutgoing = lastMsgObj?.message_type === 1;
            const isActive = c.id === selectedConvId;

            return (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className={`w-full p-3 flex items-start gap-3 border-b border-[#222526]/50 hover:bg-[#1c1e1f] text-left transition-all ${
                  isActive ? 'bg-[#222526]' : ''
                }`}
              >
                <div className="relative shrink-0">
                  {c.meta?.sender?.thumbnail || c.contact?.thumbnail ? (
                    <img src={c.meta?.sender?.thumbnail || c.contact?.thumbnail} alt={contactName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#2e3234] flex items-center justify-center text-xs font-bold text-[#eceef0]">
                      {initial}
                    </div>
                  )}
                  {c.status === 'open' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#151718]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-xs text-[#eceef0] truncate flex items-center gap-1.5">
                      {(() => {
                        const inbox = inboxMap.get(c.inbox_id);
                        return inbox ? (
                          <span className="text-[#687076] shrink-0" title={inbox.name}>
                            {CHANNEL_ICONS[inbox.channel_type] || DEFAULT_CHANNEL_ICON}
                          </span>
                        ) : null;
                      })()}
                      {contactName}
                    </span>
                    <span className="text-[10px] font-medium text-[#687076] shrink-0">
                      {formatRelativeTime(c.last_activity_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOutgoing && <CornerUpLeft size={10} className="text-[#889096] shrink-0" />}
                    <p className="text-[11px] text-[#889096] truncate leading-normal flex-1">{lastMessage}</p>
                  </div>
                </div>
                {c.unread_count > 0 && (
                  <div className="ml-2 w-4 h-4 bg-[#00a389] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-extrabold text-white">{c.unread_count}</span>
                  </div>
                )}
              </button>
            );
          })
        )}
        <div className="p-4 text-center text-[#687076] text-[10px] font-semibold tracking-wider uppercase border-t border-[#222526]/30 my-2">
          Todas as conversas carregadas
        </div>
      </div>
    </div>
  );
}
