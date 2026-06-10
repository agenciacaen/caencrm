import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

if (typeof window.IntersectionObserver === 'undefined') {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: class MockIntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

beforeEach(() => {
  localStorage.clear();
});
