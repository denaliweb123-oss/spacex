import { jest } from '@jest/globals';
import { server } from './mocks/msw.server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
