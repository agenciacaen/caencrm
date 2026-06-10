import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations, useMessages } from '../hooks/useConversations';
import { useInboxes } from '../hooks/useAccount';
import { useChatwootSocket } from '../hooks/useChatwootSocket';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useMenuToggle } from '../contexts/MenuContext';
import chatwootAPI from '../api/chatwoot';
import ConversationList from './conversations/ConversationList';
import ConversationDetail from './conversations/ConversationDetail';
import type { ChatwootAgent } from '../types/chatwoot';

export default function Conversations() {
  const navigate = useNavigate();
  const { toggleSidebar } = useMenuToggle();
  const { success, info } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [status] = useState<'open' | 'resolved' | 'pending' | 'snoozed'>('open');
  const [assigneeType, setAssigneeType] = useState<'me' | 'unassigned' | 'all'>('unassigned');
  const [activeTab, setActiveTab] = useState<'responder' | 'nota'>('responder');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'unread'>('recent');
  const [isConvListCollapsed, setIsConvListCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [agents, setAgents] = useState<ChatwootAgent[]>([]);

  const { data: inboxData } = useInboxes();
  const inboxes = inboxData?.payload || [];

  const { data: convData, loading: convLoading, error: convError, refetchBackground: refetchConversationsBg } = useConversations({
    inbox_id: selectedInboxId || undefined, status, assignee_type: assigneeType,
  });
  const rawConversations = convData?.data?.payload || [];

  const { data: msgData, loading: msgLoading, refetch: refetchMessages, refetchBackground: refetchMessagesBg } = useMessages(selectedConvId);
  const messages = msgData?.payload || [];

  const { pubsubToken } = useAuth();

  const refetchMessagesBgRef = useRef(refetchMessagesBg);
  const refetchConversationsBgRef = useRef(refetchConversationsBg);

  useEffect(() => { refetchMessagesBgRef.current = refetchMessagesBg; }, [refetchMessagesBg]);
  useEffect(() => { refetchConversationsBgRef.current = refetchConversationsBg; }, [refetchConversationsBg]);

  // Fetch agents on mount
  useEffect(() => {
    chatwootAPI.agents.get().then(setAgents).catch(() => {});
  }, []);

  const { status: wsStatus } = useChatwootSocket({
    pubsubToken,
    onEvent: useCallback((event) => {
      if (['message.created', 'conversation.updated', 'conversation.created'].includes(event.event)) {
        refetchConversationsBgRef.current();
      }
      if (event.data?.conversation_id && event.data.conversation_id === selectedConvId) {
        refetchMessagesBgRef.current();
      }
    }, [selectedConvId]),
  });

  useEffect(() => {
    if (wsStatus === 'connected') return;
    let mi: ReturnType<typeof setInterval> | null = null;
    if (selectedConvId) mi = setInterval(() => refetchMessagesBgRef.current(), 3000);
    const ci = setInterval(() => refetchConversationsBgRef.current(), 5000);
    return () => { if (mi) clearInterval(mi); clearInterval(ci); };
  }, [selectedConvId, wsStatus]);

  // Filter + sort conversations
  const conversations = useMemo(() => {
    let list = [...rawConversations];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => {
        const name = (c.meta?.sender?.name || c.contact?.name || '').toLowerCase();
        const phone = (c.meta?.sender?.phone_number || c.contact?.phone_number || '').toLowerCase();
        const email = (c.meta?.sender?.email || c.contact?.email || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || String(c.id).includes(q);
      });
    }

    // Unread filter
    if (onlyUnread) {
      list = list.filter(c => c.unread_count > 0);
    }

    // Sort
    list.sort((a, b) => {
      if (sortOrder === 'unread') {
        if (a.unread_count !== b.unread_count) return b.unread_count - a.unread_count;
        return b.last_activity_at - a.last_activity_at;
      }
      if (sortOrder === 'oldest') {
        return a.last_activity_at - b.last_activity_at;
      }
      return b.last_activity_at - a.last_activity_at;
    });

    return list;
  }, [rawConversations, searchTerm, onlyUnread, sortOrder]);

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const contactId = selectedConv?.contact?.id || selectedConv?.meta?.sender?.id;
  const companyId = selectedConv?.contact?.custom_attributes?.company_id as number | undefined;

  const handleSendMessage = async () => {
    if (!selectedConvId || !messageText.trim()) return;
    setIsSending(true);
    try {
      await chatwootAPI.messages.send(selectedConvId, messageText, activeTab === 'nota');
      setMessageText('');
      refetchMessages();
      refetchConversationsBg();
    } catch (e) {
      console.error('Erro ao enviar:', e);
    } finally { setIsSending(false); }
  };

  const handleResolveConversation = async () => {
    if (!selectedConvId) return;
    try {
      await chatwootAPI.conversations.update(selectedConvId, { status: 'resolved' });
      setSelectedConvId(null);
      refetchConversationsBg();
      success('Conversa resolvida com sucesso');
    } catch (e) { console.error('Erro ao resolver:', e); }
  };

  const handleAssignAgent = async (agentId: number) => {
    if (!selectedConvId) return;
    try {
      await chatwootAPI.conversations.update(selectedConvId, { assignee_id: agentId } as any);
      refetchConversationsBg();
      success('Conversa atribuída com sucesso');
    } catch (e) { console.error('Erro ao atribuir:', e); }
  };

  const mineCount = convData?.data?.meta?.mine_count ?? 0;
  const unassignedCount = convData?.data?.meta?.unassigned_count ?? 0;
  const allCount = convData?.data?.meta?.all_count ?? 0;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#111314] text-[#eceef0] font-sans antialiased">
      <ConversationList
        conversations={conversations}
        loading={convLoading}
        error={convError}
        selectedConvId={selectedConvId}
        onSelectConversation={setSelectedConvId}
        inboxes={inboxes}
        selectedInboxId={selectedInboxId}
        onSelectInbox={setSelectedInboxId}
        assigneeType={assigneeType}
        onChangeAssigneeType={setAssigneeType}
        wsStatus={wsStatus}
        mineCount={mineCount}
        unassignedCount={unassignedCount}
        allCount={allCount}
        onMenuToggle={toggleSidebar}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        isCollapsed={isConvListCollapsed}
        onToggleCollapse={() => setIsConvListCollapsed(!isConvListCollapsed)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onlyUnread={onlyUnread}
        onOnlyUnreadChange={setOnlyUnread}
      />
      <ConversationDetail
        selectedConv={selectedConv}
        messages={messages}
        msgLoading={msgLoading}
        onBack={() => setSelectedConvId(null)}
        onResolve={handleResolveConversation}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        contactId={contactId}
        companyId={companyId}
        agents={agents}
        onNavigateToContact={(id) => navigate(`/contatos/${id}`)}
        onNavigateToCompany={(id) => navigate(`/empresas/${id}`)}
        onAssignAgent={handleAssignAgent}
        onLinkToDeal={() => info('Vincular a Negócio estará disponível em breve')}
      />
    </div>
  );
}