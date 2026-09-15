import '@testing-library/jest-dom/vitest';

// jsdom has no IntersectionObserver, which framer-motion's whileInView needs.
class MockIntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
