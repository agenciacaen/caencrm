import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronDown, MoreVertical, User, MessageSquare, Loader2, CheckCheck, Briefcase, Building2, UserPlus, CheckCircle } from 'lucide-react';
import type { ChatwootConversation, ChatwootMessage, ChatwootAgent } from '../../types/chatwoot';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LoadingState from '../ui/LoadingState';

interface ConversationDetailProps {
  selectedConv: ChatwootConversation | undefined;
  messages: ChatwootMessage[];
  msgLoading: boolean;
  onBack: () => void;
  onResolve: () => void;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  activeTab: 'responder' | 'nota';
  onTabChange: (tab: 'responder' | 'nota') => void;
  contactId?: number;
  companyId?: number;
  agents?: ChatwootAgent[];
  onNavigateToContact?: (id: number) => void;
  onNavigateToCompany?: (id: number) => void;
  onAssignAgent?: (agentId: number) => void;
  onLinkToDeal?: () => void;
}

export default function ConversationDetail({
  selectedConv, messages, msgLoading, onBack, onResolve,
  messageText, onMessageTextChange, onSendMessage, isSending, activeTab, onTabChange,
  contactId, companyId, agents, onNavigateToContact, onNavigateToCompany, onAssignAgent, onLinkToDeal,
}: ConversationDetailProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAgentListOpen, setIsAgentListOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const agentListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (agentListRef.current && !agentListRef.current.contains(e.target as Node)) {
        setIsAgentListOpen(false);
      }
    };
    if (isMenuOpen || isAgentListOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, isAgentListOpen]);

  if (!selectedConv) {
    return (
      <div className="flex-1 flex-col bg-[#111314] hidden lg:flex">
        <div className="flex-1 flex flex-col items-center justify-center text-[#889096]">
          <MessageSquare size={48} className="mb-4 opacity-20" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#eceef0]">Nenhuma conversa ativa</h3>
          <p className="text-xs font-medium mt-1 text-[#687076]">Selecione um contato na lista para começar a responder.</p>
        </div>
      </div>
    );
  }

  const contactName = selectedConv?.meta?.sender?.name || selectedConv?.contact?.name || 'Desconhecido';
  const contactAvatar = selectedConv?.meta?.sender?.thumbnail || selectedConv?.contact?.thumbnail;
  const currentAssignee = selectedConv?.assignee || selectedConv?.meta?.assignee;

  const sortedMessages = [...messages]
    .map((msg) => ({
      ...msg,
      created_at: msg.message_type === 0 ? msg.created_at : msg.created_at + 10800,
    }))
    .sort((a, b) => a.created_at - b.created_at)
    .reverse();

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="flex-1 flex-col bg-[#111314] flex">
      {/* Chat Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#222526] bg-[#151718] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden p-2 text-[#889096] hover:bg-[#222526] rounded-lg">
            <ChevronLeft size={20} />
          </button>
          {contactAvatar ? (
            <img src={contactAvatar} alt={contactName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2e3234] flex items-center justify-center text-xs font-bold text-white">
              {contactName.substring(0, 2).toUpperCase() || '??'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-[#eceef0] tracking-tight">{contactName}</h3>
              <span className="text-[11px] text-[#687076]">#{selectedConv?.id}</span>
            </div>
            {currentAssignee && (
              <p className="text-[10px] text-[#687076] font-medium">
                {currentAssignee.available_name || currentAssignee.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResolve}
            className="bg-[#1c1e1f] border border-[#2e3234] hover:bg-[#222526] text-[#eceef0] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            Resolver <ChevronDown size={12} className="text-[#889096]" />
          </button>

          {/* More actions menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsAgentListOpen(false); }}
              className={`p-2 hover:bg-[#222526] rounded-lg transition-colors ${isMenuOpen ? 'bg-[#222526] text-[#eceef0]' : 'text-[#889096] hover:text-[#eceef0]'}`}
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-56 bg-[#1c1e1f] border border-[#2e3234] rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-fadeIn">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#687076] px-3 pt-1.5 pb-1">Ações</p>

                <button
                  onClick={() => handleMenuAction(() => onLinkToDeal?.())}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#222526] rounded-lg text-xs font-bold text-[#eceef0] transition-colors text-left"
                >
                  <Briefcase size={14} className="text-[#687076]" />
                  Vincular a Negócio
                </button>

                {contactId && onNavigateToContact && (
                  <button
                    onClick={() => handleMenuAction(() => onNavigateToContact(contactId!))}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#222526] rounded-lg text-xs font-bold text-[#eceef0] transition-colors text-left"
                  >
                    <User size={14} className="text-[#687076]" />
                    Abrir Contato
                  </button>
                )}

                {companyId && onNavigateToCompany && (
                  <button
                    onClick={() => handleMenuAction(() => onNavigateToCompany(companyId!))}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#222526] rounded-lg text-xs font-bold text-[#eceef0] transition-colors text-left"
                  >
                    <Building2 size={14} className="text-[#687076]" />
                    Abrir Empresa
                  </button>
                )}

                <div className="border-t border-[#222526] my-1" />

                <div className="relative">
                  <button
                    onClick={() => { setIsAgentListOpen(!isAgentListOpen); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#222526] rounded-lg text-xs font-bold text-[#eceef0] transition-colors text-left"
                  >
                    <UserPlus size={14} className="text-[#687076]" />
                    <div className="flex items-center justify-between w-full">
                      <span>Atribuir para...</span>
                      <span className="text-[#687076]">{agents?.length || 0}</span>
                    </div>
                  </button>
                  {isAgentListOpen && (
                    <div ref={agentListRef} className="absolute right-full mr-2 top-0 w-52 bg-[#1c1e1f] border border-[#2e3234] rounded-xl shadow-2xl z-50 p-1.5 max-h-60 overflow-y-auto no-scrollbar">
                      {agents && agents.length > 0 ? agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleMenuAction(() => onAssignAgent?.(agent.id))}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#222526] rounded-lg text-xs font-bold text-[#eceef0] transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#2e3234] flex items-center justify-center text-[9px] font-bold text-[#889096] shrink-0">
                            {(agent.available_name || agent.name).charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{agent.available_name || agent.name}</span>
                          {currentAssignee?.id === agent.id && (
                            <CheckCircle size={12} className="text-[#0091ff] ml-auto shrink-0" />
                          )}
                        </button>
                      )) : (
                        <p className="px-3 py-2 text-[10px] text-[#687076]">Nenhum agente disponível</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#222526] my-1" />

                <button
                  onClick={() => handleMenuAction(onResolve)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#222526] rounded-lg text-xs font-bold text-emerald-400 transition-colors text-left"
                >
                  <CheckCircle size={14} />
                  Marcar como Resolvido
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[#222526] mx-1" />
          <button
            onClick={() => contactId && onNavigateToContact?.(contactId)}
            className={`p-1.5 bg-[#1c1e1f] border border-[#2e3234] hover:bg-[#222526] rounded-full transition-all ${contactId && onNavigateToContact ? 'text-[#eceef0] hover:text-[#0091ff] cursor-pointer' : 'text-[#889096] cursor-default'}`}
            title={contactId ? 'Ver perfil do contato' : 'Contato não disponível'}
          >
            <User size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#111314] space-y-6 no-scrollbar flex flex-col-reverse">
        {msgLoading ? (
          <LoadingState message="Carregando mensagens..." compact />
        ) : (
          sortedMessages.map((msg) => (
            <React.Fragment key={msg.id}>
              <MessageBubble
                message={msg}
                isIncoming={msg.message_type === 0}
                isActivity={msg.message_type === 2}
                isPrivate={msg.private}
              />
            </React.Fragment>
          ))
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        messageText={messageText}
        onMessageTextChange={onMessageTextChange}
        onSend={onSendMessage}
        isSending={isSending}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
}
