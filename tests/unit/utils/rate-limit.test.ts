import { GraphQLResolveInfo } from 'graphql';

let capturedIdentifyContext: (ctx: any) => string;
const mockRateLimiter = jest.fn();

jest.mock('graphql-rate-limit', () => ({
  getGraphQLRateLimiter: jest.fn((options: { identifyContext: (ctx: any) => string }) => {
    capturedIdentifyContext = options.identifyContext;
    return mockRateLimiter;
  }),
}));

import { checkRateLimit } from '../../../src/graphql/security/rateLimit';

const FAKE_INFO = {} as GraphQLResolveInfo;

describe('checkRateLimit', () => {
  beforeEach(() => {
    mockRateLimiter.mockReset();
  });

  it('does not throw when the rate limiter returns null (request allowed)', async () => {
    mockRateLimiter.mockResolvedValue(null);
    await expect(checkRateLimit(null, {}, { ip: '1.2.3.4' }, FAKE_INFO)).resolves.toBeUndefined();
  });

  it('throws with the rate-limit message when the limiter blocks the request', async () => {
    mockRateLimiter.mockResolvedValue('Rate limit exceeded');
    await expect(
      checkRateLimit(null, {}, { ip: '1.2.3.4' }, FAKE_INFO)
    ).rejects.toThrow('Query blocked by rate limit: Rate limit exceeded');
  });

  it('passes max:100 window:1m config to the limiter', async () => {
    mockRateLimiter.mockResolvedValue(null);
    await checkRateLimit(null, {}, {}, FAKE_INFO);
    expect(mockRateLimiter).toHaveBeenCalledWith(
      expect.any(Object),
      { max: 100, window: '1m' }
    );
  });

  describe('identifyContext — fallback chain', () => {
    it('uses apiKey when present', () => {
      expect(capturedIdentifyContext({ apiKey: 'key123', ip: '1.2.3.4' })).toBe('key123');
    });

    it('falls back to ip when apiKey is absent', () => {
      expect(capturedIdentifyContext({ ip: '1.2.3.4' })).toBe('1.2.3.4');
    });

    it('falls back to x-forwarded-for header when apiKey and ip are absent', () => {
      expect(capturedIdentifyContext({ headers: { 'x-forwarded-for': '5.6.7.8' } })).toBe('5.6.7.8');
    });

    it('falls back to "anonymous" when no identifying context is available', () => {
      expect(capturedIdentifyContext({})).toBe('anonymous');
    });
  });
});
