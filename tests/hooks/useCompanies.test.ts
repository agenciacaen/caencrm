import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCompanies } from '../../hooks/useCompanies';

vi.mock('../../api/chatwoot', () => ({
  getCompanies: vi.fn(),
}));

import { getCompanies } from '../../api/chatwoot';

const mockCompanies = [
  { id: 1, name: 'Empresa A', description: 'Desc A', website: 'https://a.com', phone_number: '111111', custom_attributes: {}, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 2, name: 'Empresa B', description: 'Desc B', website: null, phone_number: null, custom_attributes: {}, created_at: '2024-01-02', updated_at: '2024-01-02' },
];

const mockResponse = (payload: any[], count?: number) => ({
  payload,
  meta: count !== undefined ? { count } : undefined,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCompanies', () => {
  it('should start with loading state and fetch companies', async () => {
    vi.mocked(getCompanies).mockResolvedValueOnce(mockResponse(mockCompanies, 2));

    const { result } = renderHook(() => useCompanies());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.payload).toHaveLength(2);
    expect(result.current.data?.payload[0].name).toBe('Empresa A');
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    vi.mocked(getCompanies).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.data?.payload).toEqual([]);
  });

  it('should support loadMore for pagination', async () => {
    vi.mocked(getCompanies)
      .mockResolvedValueOnce(mockResponse([mockCompanies[0]], 3))
      .mockResolvedValueOnce(mockResponse([mockCompanies[1]], 3));

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.payload).toHaveLength(1);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.data?.payload).toHaveLength(2);
    expect(result.current.currentPage).toBe(2);
  });

  it('should compute hasMore based on totalCount', async () => {
    vi.mocked(getCompanies).mockResolvedValueOnce(mockResponse([mockCompanies[0]], 5));

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalCount).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it('should refetch companies when refetch is called', async () => {
    vi.mocked(getCompanies)
      .mockResolvedValueOnce(mockResponse([mockCompanies[0]], 1))
      .mockResolvedValueOnce(mockResponse([mockCompanies[1]], 1));

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(getCompanies).toHaveBeenCalledTimes(2);
    expect(result.current.data?.payload[0].name).toBe('Empresa B');
  });

  it('should reset data when setFilters is called', async () => {
    vi.mocked(getCompanies).mockResolvedValue(mockResponse(mockCompanies, 2));

    const { result } = renderHook(() => useCompanies());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setFilters({ q: 'test' });
    });

    expect(result.current.filters.q).toBe('test');
    expect(getCompanies).toHaveBeenCalledTimes(2);
  });
});
