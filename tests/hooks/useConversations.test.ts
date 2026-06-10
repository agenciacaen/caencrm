import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConversations, useMessages } from '../../hooks/useConversations';

vi.mock('../../api/chatwoot', () => ({
  getConversations: vi.fn(),
  getMessages: vi.fn(),
}));

import { getConversations, getMessages } from '../../api/chatwoot';

const mockConversation = {
  id: 1,
  account_id: 1,
  inbox_id: 1,
  status: 'open',
  assignee: null,
  team: null,
  contact: { id: 1, name: 'João', email: 'joao@test.com' },
  messages: [],
  unread_count: 0,
  additional_attributes: {},
  custom_attributes: {},
  created_at: 1000,
  last_activity_at: 1001,
  labels: [],
  meta: { sender: { id: 1, name: 'João' }, assignee: null },
};

const mockConversationsResponse = {
  data: {
    meta: { mine_count: 1, unassigned_count: 0, all_count: 1 },
    payload: [mockConversation],
  },
};

const mockMessagesResponse = {
  meta: { contact: { id: 1, name: 'João' } },
  payload: [{ id: 1, content: 'Olá', message_type: 0, conversation_id: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useConversations', () => {
  it('should fetch conversations with loading state', async () => {
    vi.mocked(getConversations).mockResolvedValueOnce(mockConversationsResponse);

    const { result } = renderHook(() => useConversations());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.data.payload).toHaveLength(1);
    expect(result.current.data?.data.payload[0].status).toBe('open');
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    vi.mocked(getConversations).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useConversations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.data).toBeNull();
  });

  it('should pass filters to getConversations', async () => {
    vi.mocked(getConversations).mockResolvedValueOnce(mockConversationsResponse);

    renderHook(() => useConversations({ status: 'open', assignee_type: 'me' }));

    await waitFor(() => {
      expect(getConversations).toHaveBeenCalledWith({ status: 'open', assignee_type: 'me' });
    });
  });

  it('should call refetch and update data', async () => {
    const updatedConversation = {
      ...mockConversation,
      id: 2,
      status: 'resolved' as const,
    };
    vi.mocked(getConversations)
      .mockResolvedValueOnce(mockConversationsResponse)
      .mockResolvedValueOnce({
        data: { meta: { mine_count: 0, unassigned_count: 0, all_count: 1 }, payload: [updatedConversation] },
      });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.data.payload[0].id).toBe(1);

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.data?.data.payload[0].id).toBe(2);
    });
  });
});

describe('useMessages', () => {
  it('should not fetch when conversationId is null', async () => {
    const { result } = renderHook(() => useMessages(null));

    expect(result.current.data).toBeNull();
    expect(getMessages).not.toHaveBeenCalled();
  });

  it('should fetch messages when conversationId is provided', async () => {
    vi.mocked(getMessages).mockResolvedValueOnce(mockMessagesResponse);

    const { result } = renderHook(() => useMessages(1));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getMessages).toHaveBeenCalledWith(1);
    expect(result.current.data?.payload).toHaveLength(1);
    expect(result.current.data?.payload[0].content).toBe('Olá');
  });

  it('should handle fetch error', async () => {
    vi.mocked(getMessages).mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useMessages(1));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Not found');
  });
});
