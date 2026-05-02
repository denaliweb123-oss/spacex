jest.mock('../../../src/api', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getLaunches: () => Promise.resolve([]),
    getPastLaunches: () => Promise.resolve([]),
    getLaunch: () => Promise.resolve(null),
    getLatestLaunch: () => Promise.resolve(null),
    getUpcomingLaunchs: () => Promise.resolve([]),
    getNextLaunch: () => Promise.resolve(null),
    queryNextLaunch: () => Promise.resolve([]),
    getRockets: () => Promise.resolve([]),
    getRocket: () => Promise.resolve(null),
    queryRocket: () => Promise.resolve(null),
    getCapsules: () => Promise.resolve([]),
    getCapsule: () => Promise.resolve(null),
    getCores: () => Promise.resolve([]),
    getCore: () => Promise.resolve(null),
    getDragons: () => Promise.resolve([]),
    getDragon: () => Promise.resolve(null),
    getHistoryEvents: () => Promise.resolve([]),
    getHistoryEvent: () => Promise.resolve(null),
    queryHistoryEvent: () => Promise.resolve([]),
    getLandpads: () => Promise.resolve([]),
    getLandpad: () => Promise.resolve(null),
    getLaunchPads: () => Promise.resolve([]),
    getLaunchPad: () => Promise.resolve(null),
    getPayloads: () => Promise.resolve([]),
    getPayload: () => Promise.resolve(null),
    queryPayloads: () => Promise.resolve([]),
    getShips: () => Promise.resolve([]),
    getShip: () => Promise.resolve(null),
    queryShips: () => Promise.resolve(null),
    company: () => Promise.resolve(null),
    getRoadster: () => Promise.resolve(null),
  })),
}));

import { replayFailure } from '../../../src/qa/runner';
import { CoverageFailure } from '../../../src/qa/agents/coverage-agent';

const BASE_FAILURE: CoverageFailure = {
  timestamp: '2026-01-01T00:00:00.000Z',
  field: '{ launches { id } }',
  reason: '❌ ANOMALY: EXECUTION_ERROR',
  severity: 'HIGH',
};

describe('replayFailure', () => {
  it('returns null when a previously failing query now executes cleanly', async () => {
    const result = await replayFailure(BASE_FAILURE);
    expect(result).toBeNull();
  }, 15000);

  it('returns EXECUTION_ERROR when the replayed query still produces errors', async () => {
    const failure: CoverageFailure = {
      ...BASE_FAILURE,
      // completely invalid GraphQL — will cause a parse/validation error
      field: '{ nonExistentField { bogus } }',
    };
    const result = await replayFailure(failure);
    expect(result).toBe('❌ ANOMALY: EXECUTION_ERROR');
  }, 15000);

  it('returns the anomaly string, not throws, when execution errors occur', async () => {
    const failure: CoverageFailure = {
      ...BASE_FAILURE,
      field: '{ launch(id: "x") { nonExistentField } }',
    };
    await expect(replayFailure(failure)).resolves.not.toThrow();
  }, 15000);
});
