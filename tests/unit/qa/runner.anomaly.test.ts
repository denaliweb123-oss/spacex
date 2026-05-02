jest.mock('../../../src/qa/agents/coverage-agent', () => ({
  ...jest.requireActual('../../../src/qa/agents/coverage-agent'),
  recordFailure: jest.fn(),
}));

jest.mock('../../../src/qa/agents/anomaly-agent', () => ({
  detectAnomaly: jest.fn(),
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

import { runAutonomousQA } from '../../../src/qa/runner';
import { recordFailure } from '../../../src/qa/agents/coverage-agent';
import { detectAnomaly } from '../../../src/qa/agents/anomaly-agent';

const mockRecordFailure = recordFailure as jest.Mock;
const mockDetectAnomaly = detectAnomaly as jest.Mock;

beforeEach(() => {
  mockRecordFailure.mockClear();
  mockDetectAnomaly.mockReset();
});

describe('runAutonomousQA — anomaly recording path', () => {
  it('increments highSeverityAnomalies for EXECUTION_ERROR', async () => {
    mockDetectAnomaly.mockReturnValueOnce('❌ ANOMALY: EXECUTION_ERROR').mockReturnValue(null);
    const metrics = await runAutonomousQA({ writeMetrics: false });
    expect(metrics.highSeverityAnomalies).toBe(1);
    expect(metrics.mediumSeverityAnomalies).toBe(0);
    expect(metrics.totalAnomaliesDetected).toBe(1);
  }, 30000);

  it('increments mediumSeverityAnomalies for LATENCY_THRESHOLD_EXCEEDED', async () => {
    mockDetectAnomaly
      .mockReturnValueOnce('⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED')
      .mockReturnValue(null);
    const metrics = await runAutonomousQA({ writeMetrics: false });
    expect(metrics.mediumSeverityAnomalies).toBe(1);
    expect(metrics.highSeverityAnomalies).toBe(0);
    expect(metrics.totalAnomaliesDetected).toBe(1);
  }, 30000);

  it('accumulates both severities independently', async () => {
    mockDetectAnomaly
      .mockReturnValueOnce('❌ ANOMALY: EXECUTION_ERROR')
      .mockReturnValueOnce('⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED')
      .mockReturnValue(null);
    const metrics = await runAutonomousQA({ writeMetrics: false });
    expect(metrics.highSeverityAnomalies).toBe(1);
    expect(metrics.mediumSeverityAnomalies).toBe(1);
    expect(metrics.totalAnomaliesDetected).toBe(2);
  }, 30000);

  it('populates the anomalies array with correct severity and reason', async () => {
    mockDetectAnomaly.mockReturnValueOnce('❌ ANOMALY: EXECUTION_ERROR').mockReturnValue(null);
    const metrics = await runAutonomousQA({ writeMetrics: false });
    expect(metrics.anomalies).toHaveLength(1);
    expect(metrics.anomalies[0].severity).toBe('HIGH');
    expect(metrics.anomalies[0].reason).toBe('❌ ANOMALY: EXECUTION_ERROR');
    expect(metrics.anomalies[0].field).toBeDefined();
  }, 30000);

  it('calls recordFailure once per detected anomaly with the correct severity', async () => {
    mockDetectAnomaly
      .mockReturnValueOnce('❌ ANOMALY: EXECUTION_ERROR')
      .mockReturnValueOnce('⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED')
      .mockReturnValue(null);
    await runAutonomousQA({ writeMetrics: false });
    expect(mockRecordFailure).toHaveBeenCalledTimes(2);
    expect(mockRecordFailure.mock.calls[0][0].severity).toBe('HIGH');
    expect(mockRecordFailure.mock.calls[1][0].severity).toBe('MEDIUM');
  }, 30000);
});
