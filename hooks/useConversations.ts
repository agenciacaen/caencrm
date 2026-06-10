// Hook para buscar conversas reais do Chatwoot

import { useChatwootApi } from './useChatwootApi';
import { getConversations, getMessages } from '../api/chatwoot';
import type { ChatwootConversation, ChatwootMessage, ConversationFilters, MessagesResponse } from '../types/chatwoot';

export function useConversations(filters?: ConversationFilters) {
  return useChatwootApi(
    () => getConversations(filters),
    [filters?.status, filters?.assignee_type, filters?.page, filters?.inbox_id]
  );
}

export function useMessages(conversationId: number | null) {
  return useChatwootApi<MessagesResponse | null>(
    async () => {
      if (!conversationId) return null;
      return getMessages(conversationId);
    },
    [conversationId]
  );
}
