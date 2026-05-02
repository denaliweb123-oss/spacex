// writeFileSync is mocked so the runner never touches the real filesystem,
// while readFileSync still uses the real implementation to load schema.graphql.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
}));

jest.mock('../../../src/qa/agents/coverage-agent', () => ({
  ...jest.requireActual('../../../src/qa/agents/coverage-agent'),
  recordFailure: jest.fn(),
}));

jest.mock('../../../src/api', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getCapsules: () => Promise.resolve([]),
    getCapsule: () => Promise.resolve(null),
    company: () => Promise.resolve(null),
    getCores: () => Promise.resolve([]),
    getCore: () => Promise.resolve(null),
    getDragons: () => Promise.resolve([]),
    getDragon: () => Promise.resolve(null),
    getHistoryEvents: () => Promise.resolve([]),
    getHistoryEvent: () => Promise.resolve(null),
    queryHistoryEvent: () => Promise.resolve([]),
    getLandpads: () => Promise.resolve([]),
    getLandpad: () => Promise.resolve(null),
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
    getShips: () => Promise.resolve([]),
    getShip: () => Promise.resolve(null),
    queryShips: () => Promise.resolve(null),
    getLaunchPads: () => Promise.resolve([]),
    getLaunchPad: () => Promise.resolve(null),
    getPayloads: () => Promise.resolve([]),
    getPayload: () => Promise.resolve(null),
    queryPayloads: () => Promise.resolve([]),
    getRoadster: () => Promise.resolve(null),
  })),
}));

import * as fs from 'fs';
import { runAutonomousQA } from '../../../src/qa/runner';

const mockWriteFileSync = fs.writeFileSync as jest.Mock;

beforeEach(() => {
  mockWriteFileSync.mockClear();
});

describe('runAutonomousQA — writeMetrics path', () => {
  it('writes qa-metrics.json when writeMetrics is true', async () => {
    await runAutonomousQA({ writeMetrics: true });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      'qa-metrics.json',
      expect.stringContaining('"totalQueriesExecuted"')
    );
  }, 30000);

  it('does not write qa-metrics.json when writeMetrics is false', async () => {
    await runAutonomousQA({ writeMetrics: false });
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  }, 30000);

  it('does not write qa-metrics.json when writeMetrics is omitted (defaults false)', async () => {
    await runAutonomousQA();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  }, 30000);
});
