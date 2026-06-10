import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

// Track all created observer instances
let currentInstances: MockIO[] = [];

class MockIO {
  callback: (entries: IntersectionObserverEntry[]) => void;
  node: Element | null = null;

  constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
    this.callback = callback;
    currentInstances.push(this);
  }

  observe = vi.fn((node: Element) => {
    this.node = node;
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

function setupMock() {
  currentInstances = [];
  (window as any).IntersectionObserver = class {
    constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
      const instance = new MockIO(callback);
      currentInstances.push(instance);
      return instance;
    }
  };
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    delete (window as any).IntersectionObserver;
    currentInstances = [];
  });

  it('should return a setSentinel function', () => {
    setupMock();
    const { result } = renderHook(() =>
      useInfiniteScroll({ hasMore: true, loading: false, onLoadMore: vi.fn() })
    );
    expect(result.current.setSentinel).toBeDefined();
    expect(typeof result.current.setSentinel).toBe('function');
  });

  it('should call onLoadMore when sentinel becomes intersecting and hasMore is true', () => {
    setupMock();
    const onLoadMore = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteScroll({ hasMore: true, loading: false, onLoadMore })
    );

    act(() => {
      result.current.setSentinel(document.createElement('div'));
    });

    expect(currentInstances.length).toBeGreaterThan(0);
    const observer = currentInstances[currentInstances.length - 1];

    act(() => {
      observer.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onLoadMore when hasMore is false', () => {
    setupMock();
    const onLoadMore = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteScroll({ hasMore: false, loading: false, onLoadMore })
    );

    act(() => {
      result.current.setSentinel(document.createElement('div'));
    });

    const observer = currentInstances[currentInstances.length - 1];
    act(() => {
      observer.trigger(true);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should NOT call onLoadMore when loading is true', () => {
    setupMock();
    const onLoadMore = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteScroll({ hasMore: true, loading: true, onLoadMore })
    );

    act(() => {
      result.current.setSentinel(document.createElement('div'));
    });

    const observer = currentInstances[currentInstances.length - 1];
    act(() => {
      observer.trigger(true);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should disconnect observer on unmount', () => {
    setupMock();

    const { result, unmount } = renderHook(() =>
      useInfiniteScroll({ hasMore: true, loading: false, onLoadMore: vi.fn() })
    );

    act(() => {
      result.current.setSentinel(document.createElement('div'));
    });

    const observer = currentInstances[currentInstances.length - 1];
    expect(observer.disconnect).not.toHaveBeenCalled();

    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
  });
});
