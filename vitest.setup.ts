import 'vitest-canvas-mock';
import { vi } from 'vitest';
import { setupIntersectionMocking, resetIntersectionMocking } from 'react-intersection-observer/test-utils';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @ts-expect-error
beforeEach(() => {
  setupIntersectionMocking(vi.fn);
});

// @ts-expect-error
afterEach(() => {
  resetIntersectionMocking();
});
