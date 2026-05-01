import { applyLimitOffset } from "../limit-offset-service";

const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("applyLimitOffset", () => {
  it("returns all items when limit and offset are omitted", () => {
    expect(applyLimitOffset({ data })).toEqual(data);
  });

  it("limits to the first N items", () => {
    expect(applyLimitOffset({ data, limit: 3 })).toEqual([0, 1, 2]);
  });

  it("skips items according to offset", () => {
    expect(applyLimitOffset({ data, offset: 5 })).toEqual([5, 6, 7, 8, 9]);
  });

  it("applies limit and offset together (page 2 of 3)", () => {
    expect(applyLimitOffset({ data, limit: 3, offset: 3 })).toEqual([3, 4, 5]);
  });

  it("returns empty array when offset exceeds data length", () => {
    expect(applyLimitOffset({ data, offset: 20 })).toEqual([]);
  });

  it("returns empty array when limit is 0", () => {
    expect(applyLimitOffset({ data, limit: 0 })).toEqual([]);
  });

  it("throws on negative limit", () => {
    expect(() => applyLimitOffset({ data, limit: -1 })).toThrow("Limit must be a non-negative integer");
  });

  it("throws on negative offset", () => {
    expect(() => applyLimitOffset({ data, offset: -1 })).toThrow("Offset must be a non-negative integer");
  });
});
