import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

/**
 * Overrides one or more URL patterns with a network-level failure for the
 * duration of the current test. MSW resets overrides after each test via
 * server.resetHandlers() in setup.ts.
 *
 * Use this to verify that the application handles connection refused /
 * fetch-level errors (not HTTP errors) correctly.
 */
export function simulateNetworkError(...urlPatterns: string[]): void {
  server.use(
    ...urlPatterns.flatMap((pattern) => [
      http.get(pattern, () => HttpResponse.error()),
      http.post(pattern, () => HttpResponse.error()),
    ]),
  );
}

/**
 * Overrides one or more URL patterns to return an HTTP error status for the
 * duration of the current test.
 *
 * Common values: 500 (internal error), 503 (unavailable), 429 (rate limit),
 * 401 (unauthenticated), 403 (forbidden).
 */
export function simulateHttpError(status: number, ...urlPatterns: string[]): void {
  server.use(
    ...urlPatterns.flatMap((pattern) => [
      http.get(pattern, () => HttpResponse.json(null, { status })),
      http.post(pattern, () => HttpResponse.json(null, { status })),
    ]),
  );
}

/**
 * Overrides one or more URL patterns to inject a fixed delay before
 * responding for the duration of the current test.
 *
 * Use this to verify timeout handling or to reproduce slow-upstream scenarios
 * in performance tests.
 */
export function simulateSlowResponse(delayMs: number, ...urlPatterns: string[]): void {
  server.use(
    ...urlPatterns.flatMap((pattern) => [
      http.get(pattern, async () => {
        await delay(delayMs);
        return HttpResponse.json(null);
      }),
    ]),
  );
}
