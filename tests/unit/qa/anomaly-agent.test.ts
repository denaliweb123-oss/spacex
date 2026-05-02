import { detectAnomaly } from '../../../src/qa/agents/anomaly-agent';

describe('detectAnomaly', () => {
  afterEach(() => {
    delete process.env.QA_LATENCY_THRESHOLD;
  });

  it('returns null when fast and no error', () => {
    expect(detectAnomaly({ duration: 10, hasError: false })).toBeNull();
  });

  it('returns LATENCY_THRESHOLD_EXCEEDED when duration exceeds threshold', () => {
    expect(detectAnomaly({ duration: 51, hasError: false })).toBe(
      '⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED'
    );
  });

  it('returns EXECUTION_ERROR when fast but hasError is true', () => {
    expect(detectAnomaly({ duration: 10, hasError: true })).toBe(
      '❌ ANOMALY: EXECUTION_ERROR'
    );
  });

  it('latency takes priority over execution error when both conditions are true', () => {
    expect(detectAnomaly({ duration: 51, hasError: true })).toBe(
      '⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED'
    );
  });

  it('respects QA_LATENCY_THRESHOLD env override', () => {
    process.env.QA_LATENCY_THRESHOLD = '200';
    expect(detectAnomaly({ duration: 100, hasError: false })).toBeNull();
    expect(detectAnomaly({ duration: 201, hasError: false })).toBe(
      '⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED'
    );
  });

  it('returns null exactly at threshold boundary (not strictly greater)', () => {
    expect(detectAnomaly({ duration: 50, hasError: false })).toBeNull();
  });
});
