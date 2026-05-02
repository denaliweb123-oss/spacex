// fs must be mocked at the module level — its exports are non-configurable
// and cannot be spied on after the fact.
jest.mock('fs');

import * as fs from 'fs';
import {
  CoverageFailure,
  recordFailure,
  forgetFailure,
  readFailureMemory,
} from '../../../src/qa/agents/coverage-agent';

const HIGH: CoverageFailure = {
  timestamp: '2026-01-01T00:00:00.000Z',
  field: '{ launches { id } }',
  reason: '❌ ANOMALY: EXECUTION_ERROR',
  severity: 'HIGH',
};

const MEDIUM: CoverageFailure = {
  timestamp: '2026-01-01T00:00:01.000Z',
  field: '{ rockets { id } }',
  reason: '⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED',
  severity: 'MEDIUM',
};

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(jest.fn()));
afterEach(() => jest.restoreAllMocks());

function setMemory(memory: object) {
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue(JSON.stringify(memory));
}

function emptyMemory() {
  setMemory({ slowQueries: [], failingQueries: [] });
}

describe('readFailureMemory', () => {
  it('returns empty memory when the file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(readFailureMemory()).toEqual({ slowQueries: [], failingQueries: [] });
  });

  it('returns parsed memory when the file exists', () => {
    setMemory({ slowQueries: [MEDIUM], failingQueries: [HIGH] });
    expect(readFailureMemory()).toEqual({ slowQueries: [MEDIUM], failingQueries: [HIGH] });
  });

  it('defaults missing buckets to empty arrays', () => {
    setMemory({});
    expect(readFailureMemory()).toEqual({ slowQueries: [], failingQueries: [] });
  });
});

describe('recordFailure — bucket routing', () => {
  beforeEach(() => {
    emptyMemory();
    mockWriteFileSync.mockImplementation(jest.fn());
  });

  it('routes HIGH severity to failingQueries', () => {
    recordFailure(HIGH);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(1);
    expect(written.slowQueries).toHaveLength(0);
  });

  it('routes MEDIUM severity to slowQueries', () => {
    recordFailure(MEDIUM);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.slowQueries).toHaveLength(1);
    expect(written.failingQueries).toHaveLength(0);
  });

  it('routes CRITICAL severity to failingQueries', () => {
    recordFailure({ ...HIGH, severity: 'CRITICAL' });
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(1);
  });
});

describe('recordFailure — deduplication', () => {
  beforeEach(() => {
    mockWriteFileSync.mockImplementation(jest.fn());
  });

  it('updates an existing entry instead of appending a duplicate', () => {
    setMemory({ slowQueries: [], failingQueries: [HIGH] });
    const updated = { ...HIGH, timestamp: '2026-06-01T00:00:00.000Z' };
    recordFailure(updated);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(1);
    expect(written.failingQueries[0].timestamp).toBe('2026-06-01T00:00:00.000Z');
  });

  it('appends when the failure does not match any existing entry', () => {
    setMemory({ slowQueries: [], failingQueries: [HIGH] });
    recordFailure({ ...HIGH, field: '{ rockets { id } }' });
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(2);
  });
});

describe('forgetFailure', () => {
  beforeEach(() => {
    mockWriteFileSync.mockImplementation(jest.fn());
  });

  it('removes a matching HIGH failure from failingQueries', () => {
    setMemory({ slowQueries: [], failingQueries: [HIGH] });
    forgetFailure(HIGH);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(0);
  });

  it('removes a matching MEDIUM failure from slowQueries', () => {
    setMemory({ slowQueries: [MEDIUM], failingQueries: [] });
    forgetFailure(MEDIUM);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.slowQueries).toHaveLength(0);
  });

  it('leaves non-matching failures untouched', () => {
    const other = { ...HIGH, field: '{ rockets { id } }' };
    setMemory({ slowQueries: [], failingQueries: [HIGH, other] });
    forgetFailure(HIGH);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.failingQueries).toHaveLength(1);
    expect(written.failingQueries[0].field).toBe(other.field);
  });
});
