import { applyLimitOffset } from '../../../limit-offset-service';

describe('Limit-Offset Service Unit Tests', () => {
  const mockData = [1, 2, 3, 4, 5];

  it('returns all data when no limit or offset is provided', () => {
    expect(applyLimitOffset({ data: mockData })).toEqual(mockData);
  });

  it('applies limit correctly', () => {
    expect(applyLimitOffset({ data: mockData, limit: 2 })).toEqual([1, 2]);
  });

  it('applies offset correctly', () => {
    expect(applyLimitOffset({ data: mockData, offset: 2 })).toEqual([3, 4, 5]);
  });

  it('applies both limit and offset', () => {
    expect(applyLimitOffset({ data: mockData, limit: 2, offset: 1 })).toEqual([2, 3]);
  });

  it('returns empty array when offset is beyond data length', () => {
    expect(applyLimitOffset({ data: mockData, limit: 10, offset: 10 })).toEqual([]);
  });

  it('returns empty array when limit is 0', () => {
    expect(applyLimitOffset({ data: mockData, limit: 0 })).toEqual([]);
  });
});