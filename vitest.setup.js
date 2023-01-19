import 'vitest-canvas-mock';
import { vi } from 'vitest';
import { setupIntersectionMocking, resetIntersectionMocking } from 'react-intersection-observer/test-utils';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  setupIntersectionMocking(vi.fn);
});

afterEach(() => {
  resetIntersectionMocking();
});
