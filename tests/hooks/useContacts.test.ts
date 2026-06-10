import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContacts } from '../../hooks/useContacts';

vi.mock('../../api/chatwoot', () => ({
  getContacts: vi.fn(),
}));

import { getContacts } from '../../api/chatwoot';

const mockContacts = [
  { id: 1, name: 'João', email: 'joao@test.com', phone_number: '11999999999', thumbnail: '', additional_attributes: {}, custom_attributes: {}, identifier: null, created_at: 1000, last_activity_at: null, availability_status: 'online' },
  { id: 2, name: 'Maria', email: 'maria@test.com', phone_number: null, thumbnail: '', additional_attributes: {}, custom_attributes: {}, identifier: null, created_at: 1001, last_activity_at: null, availability_status: 'offline' },
];

const mockResponse = (payload: any[], count: number) => ({
  payload,
  meta: { count, current_page: 1 },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useContacts', () => {
  it('should start with loading state and fetch data', async () => {
    vi.mocked(getContacts).mockResolvedValueOnce(mockResponse(mockContacts, 2));

    const { result } = renderHook(() => useContacts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.payload).toHaveLength(2);
    expect(result.current.data?.payload[0].name).toBe('João');
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    vi.mocked(getContacts).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.data?.payload).toEqual([]);
  });

  it('should support loadMore for pagination', async () => {
    vi.mocked(getContacts)
      .mockResolvedValueOnce(mockResponse([mockContacts[0]], 3))
      .mockResolvedValueOnce(mockResponse([mockContacts[1]], 3));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payload).toHaveLength(1);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.data?.payload).toHaveLength(2);
    expect(result.current.currentPage).toBe(2);
  });

  it('should compute hasMore correctly', async () => {
    vi.mocked(getContacts).mockResolvedValueOnce(mockResponse([mockContacts[0]], 5));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(5);
  });

  it('should not have more when total is reached', async () => {
    vi.mocked(getContacts).mockResolvedValueOnce(mockResponse(mockContacts, 2));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(false);
  });

  it('should refetch data when refetch is called', async () => {
    vi.mocked(getContacts)
      .mockResolvedValueOnce(mockResponse([mockContacts[0]], 1))
      .mockResolvedValueOnce(mockResponse([mockContacts[1]], 1));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payload[0].name).toBe('João');

    await act(async () => {
      await result.current.refetch();
    });

    expect(getContacts).toHaveBeenCalledTimes(2);
    expect(result.current.data?.payload[0].name).toBe('Maria');
  });

  it('should reset data when setFilters is called', async () => {
    vi.mocked(getContacts).mockResolvedValue(mockResponse(mockContacts, 2));

    const { result } = renderHook(() => useContacts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payload).toHaveLength(2);

    await act(async () => {
      result.current.setFilters({ q: 'joao' });
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
    });
    expect(result.current.filters.q).toBe('joao');
    expect(getContacts).toHaveBeenCalledTimes(2);
  });
});
