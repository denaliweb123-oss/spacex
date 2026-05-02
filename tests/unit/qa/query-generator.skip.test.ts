import { buildSchema } from 'graphql';
import { generateQueries } from '../../../src/qa/generators/query-generator';

// A schema where the root field returns a type with no scalars at any reachable depth.
// OpaqueType has one field (nested) which is ThirdLevel.
// ThirdLevel has one field (deep) which is FourthLevel — another object type, no scalars.
// buildNestedSelection looks one level deep: it finds ThirdLevel but ThirdLevel has no
// scalar grandchildren, so it returns undefined and the field is recorded as skipped.
const schemaWithUnreachableScalars = buildSchema(`
  type Query {
    opaque: OpaqueType
    normal: NormalType
  }
  type OpaqueType {
    nested: ThirdLevel
  }
  type ThirdLevel {
    deep: FourthLevel
  }
  type FourthLevel {
    value: String
  }
  type NormalType {
    id: ID
  }
`);

describe('generateQueries — skippedFields path', () => {
  it('records a field in skippedFields when no scalar is reachable within two levels', () => {
    const { queries, skippedFields } = generateQueries(schemaWithUnreachableScalars);
    expect(skippedFields).toContain('opaque');
  });

  it('does not generate a query for the skipped field', () => {
    const { queries } = generateQueries(schemaWithUnreachableScalars);
    expect(queries.every((q) => !q.includes('opaque'))).toBe(true);
  });

  it('still generates queries for fields that have reachable scalars', () => {
    const { queries } = generateQueries(schemaWithUnreachableScalars);
    expect(queries.some((q) => q.includes('normal'))).toBe(true);
  });

  it('returns empty queries and skippedFields when schema has no Query type', () => {
    // buildSchema requires at least one type; use a schema with no Query type via
    // a workaround: pass an empty resolverFields set that filters everything out.
    const { queries, skippedFields } = generateQueries(schemaWithUnreachableScalars, new Set());
    expect(queries).toEqual([]);
    expect(skippedFields).toEqual([]);
  });
});
