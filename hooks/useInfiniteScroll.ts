import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 0.1,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const onLoadMoreRef = useRef(onLoadMore);

  hasMoreRef.current = hasMore;
  loadingRef.current = loading;
  onLoadMoreRef.current = onLoadMore;

  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
            onLoadMoreRef.current();
          }
        },
        { threshold, rootMargin }
      );
      observerRef.current.observe(node);
    }
  }, [threshold, rootMargin]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { setSentinel };
}

export default useInfiniteScroll;
