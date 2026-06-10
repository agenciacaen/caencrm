import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInboxes, useAgents, useLabels } from '../../hooks/useAccount';

vi.mock('../../api/chatwoot', () => ({
  getInboxes: vi.fn(),
  getAgents: vi.fn(),
  getLabels: vi.fn(),
}));

import { getInboxes, getAgents, getLabels } from '../../api/chatwoot';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInboxes', () => {
  it('should fetch inboxes with loading state', async () => {
    const mockInboxes = {
      payload: [
        { id: 1, name: 'WhatsApp', channel_type: 'Channel::Whatsapp', avatar_url: '', greeting_enabled: false, greeting_message: null, working_hours_enabled: false, out_of_office_message: null },
      ],
    };
    vi.mocked(getInboxes).mockResolvedValueOnce(mockInboxes);

    const { result } = renderHook(() => useInboxes());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.payload).toHaveLength(1);
    expect(result.current.data?.payload[0].name).toBe('WhatsApp');
    expect(result.current.error).toBeNull();
  });

  it('should handle error', async () => {
    vi.mocked(getInboxes).mockRejectedValueOnce(new Error('Error fetching inboxes'));

    const { result } = renderHook(() => useInboxes());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error fetching inboxes');
    expect(result.current.data).toBeNull();
  });

  it('should support refetch', async () => {
    const inbox1 = { payload: [{ id: 1, name: 'Inbox 1' }] };
    const inbox2 = { payload: [{ id: 2, name: 'Inbox 2' }] };
    vi.mocked(getInboxes)
      .mockResolvedValueOnce(inbox1 as any)
      .mockResolvedValueOnce(inbox2 as any);

    const { result } = renderHook(() => useInboxes());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payload[0].name).toBe('Inbox 1');

    result.current.refetch();

    await waitFor(() => {
      expect(result.current.data?.payload[0].name).toBe('Inbox 2');
    });
  });
});

describe('useAgents', () => {
  it('should fetch agents list', async () => {
    const mockAgents = [
      { id: 1, uid: 'u1', name: 'Agent A', email: 'a@test.com', available_name: 'Agent A', type: 'user' as const, availability_status: 'online' as const, thumbnail: '', role: 'agent' as const },
    ];
    vi.mocked(getAgents).mockResolvedValueOnce(mockAgents);

    const { result } = renderHook(() => useAgents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('Agent A');
  });

  it('should handle error', async () => {
    vi.mocked(getAgents).mockRejectedValueOnce(new Error('Agents error'));

    const { result } = renderHook(() => useAgents());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Agents error');
  });
});

describe('useLabels', () => {
  it('should fetch labels', async () => {
    const mockLabels = {
      payload: [
        { id: 1, title: 'VIP', description: 'Very important', color: '#ff0000', show_on_sidebar: true },
      ],
    };
    vi.mocked(getLabels).mockResolvedValueOnce(mockLabels);

    const { result } = renderHook(() => useLabels());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.payload).toHaveLength(1);
    expect(result.current.data?.payload[0].title).toBe('VIP');
  });

  it('should handle error', async () => {
    vi.mocked(getLabels).mockRejectedValueOnce(new Error('Labels error'));

    const { result } = renderHook(() => useLabels());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Labels error');
  });
});
