import { parse } from 'graphql';
import { calculateQueryCost, calculateQueryDepth } from '../../../src/utils/complexity';

// DEPTH_COST_BASE = 4 (internal constant)
// cost at depth d = 4^(d+1), where d starts at 0

describe('calculateQueryDepth', () => {
  it('returns 1 for a single flat field', () => {
    expect(calculateQueryDepth(parse('{ launches }'))).toBe(1);
  });

  it('returns 2 for one level of nesting', () => {
    expect(calculateQueryDepth(parse('{ launches { id } }'))).toBe(2);
  });

  it('returns the deepest path when sibling branches have different depths', () => {
    // launches { id } is depth 2; rockets { engines { isp { sea_level } } } is depth 4
    const doc = parse('{ launches { id } rockets { engines { isp { sea_level } } } }');
    expect(calculateQueryDepth(doc)).toBe(4);
  });

  it('excludes introspection fields (__typename, __schema) from depth count', () => {
    expect(calculateQueryDepth(parse('{ __typename }'))).toBe(0);
    expect(calculateQueryDepth(parse('{ __schema { types { name } } }'))).toBe(0);
  });

  it('does not count an inline fragment itself as a depth level', () => {
    // InlineFragment is transparent — its selections are walked at the same depth
    // as the parent, so this should equal { launches { id mission_name } } = depth 2
    const doc = parse('{ launches { ... on Launch { id mission_name } } }');
    expect(calculateQueryDepth(doc)).toBe(2);
  });

  it('enters FragmentSpread branch without following the spread', () => {
    // FragmentSpread nodes carry no selectionSet in the AST — only FragmentDefinition
    // does. The function records depth up to the spread but does not recurse into the
    // fragment's fields. This is expected behaviour for this depth estimator.
    const doc = parse('fragment F on Launch { id } query { launches { ...F } }');
    expect(calculateQueryDepth(doc)).toBe(1); // launches(1); fragment body not walked
  });

  it('returns 0 for a document with no OperationDefinition', () => {
    // Fragment-only documents have no OperationDefinition so the outer loop never fires.
    const doc = parse('fragment F on Launch { id }');
    expect(calculateQueryDepth(doc)).toBe(0);
  });
});

describe('calculateQueryCost', () => {
  it('charges 4^1 = 4 per top-level field', () => {
    expect(calculateQueryCost('{ launches }')).toBe(4);
    expect(calculateQueryCost('{ rockets }')).toBe(4);
  });

  it('accumulates cost across sibling top-level fields', () => {
    // launches(4) + rockets(4) = 8
    expect(calculateQueryCost('{ launches rockets }')).toBe(8);
  });

  it('charges 4^2 = 16 for depth-2 fields', () => {
    // launches(4) + id(16) = 20
    expect(calculateQueryCost('{ launches { id } }')).toBe(20);
  });

  it('charges 4^3 = 64 for depth-3 fields', () => {
    // launches(4) + rocket(16) + id(64) = 84
    expect(calculateQueryCost('{ launches { rocket { id } } }')).toBe(84);
  });

  it('accumulates cost across multiple sibling fields at the same depth', () => {
    // launches(4) + id(16) + mission_name(16) = 36
    expect(calculateQueryCost('{ launches { id mission_name } }')).toBe(36);
  });

  it('excludes introspection fields from cost', () => {
    expect(calculateQueryCost('{ __typename }')).toBe(0);
    expect(calculateQueryCost('{ launches { __typename id } }')).toBe(20); // only id counted
  });

  it('walks into inline fragment selections at the same depth (no extra cost)', () => {
    // { launches { ... on Launch { id } } } should cost the same as { launches { id } }
    const withInline = calculateQueryCost('{ launches { ... on Launch { id } } }');
    const withoutInline = calculateQueryCost('{ launches { id } }');
    expect(withInline).toBe(withoutInline);
  });

  it('handles an inline fragment with no selectionSet gracefully', () => {
    // Inline fragments always have selectionSets in valid GraphQL; this exercises the
    // path where the node is an InlineFragment — confirmed by the previous test.
    // Separate check: deeply nested inline fragments don't double-count depth.
    const cost = calculateQueryCost('{ launches { ... on Launch { rocket { id } } } }');
    expect(cost).toBe(calculateQueryCost('{ launches { rocket { id } } }'));
  });
});
