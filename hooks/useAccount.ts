// Hook para buscar dados de inboxes e conexões do Chatwoot

import { useChatwootApi } from './useChatwootApi';
import { getInboxes, getAgents, getLabels } from '../api/chatwoot';
import type { ChatwootInbox, ChatwootAgent, ChatwootLabel } from '../types/chatwoot';

export function useInboxes() {
  return useChatwootApi<{ payload: ChatwootInbox[] }>(
    () => getInboxes(),
    []
  );
}

export function useAgents() {
  return useChatwootApi<ChatwootAgent[]>(
    () => getAgents(),
    []
  );
}

export function useLabels() {
  return useChatwootApi<{ payload: ChatwootLabel[] }>(
    () => getLabels(),
    []
  );
}
