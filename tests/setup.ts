import { server } from './mocks/msw.server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
