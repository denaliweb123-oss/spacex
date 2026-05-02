import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { fixtureLiteralForType } from '../../../src/qa/generators/argument-fixtures';

describe('fixtureLiteralForType — scalars', () => {
  it('returns "qa-fixture" for String', () => {
    expect(fixtureLiteralForType(GraphQLString)).toBe('"qa-fixture"');
  });

  it('returns "qa-fixture-id" for ID', () => {
    expect(fixtureLiteralForType(GraphQLID)).toBe('"qa-fixture-id"');
  });

  it('returns 1 for Int', () => {
    expect(fixtureLiteralForType(GraphQLInt)).toBe('1');
  });

  it('returns 1.5 for Float', () => {
    expect(fixtureLiteralForType(GraphQLFloat)).toBe('1.5');
  });

  it('returns true for Boolean', () => {
    expect(fixtureLiteralForType(GraphQLBoolean)).toBe('true');
  });

  it('returns a named placeholder for custom scalar types', () => {
    const DateScalar = new GraphQLScalarType({ name: 'Date', serialize: (v) => v });
    expect(fixtureLiteralForType(DateScalar)).toBe('"qa-date-fixture"');
  });
});

describe('fixtureLiteralForType — wrapper types', () => {
  it('unwraps NonNull and returns the inner fixture', () => {
    expect(fixtureLiteralForType(new GraphQLNonNull(GraphQLString))).toBe('"qa-fixture"');
    expect(fixtureLiteralForType(new GraphQLNonNull(GraphQLInt))).toBe('1');
  });

  it('wraps the inner fixture in brackets for List', () => {
    expect(fixtureLiteralForType(new GraphQLList(GraphQLInt))).toBe('[1]');
    expect(fixtureLiteralForType(new GraphQLList(GraphQLString))).toBe('["qa-fixture"]');
  });

  it('handles NonNull wrapping a List', () => {
    expect(fixtureLiteralForType(new GraphQLNonNull(new GraphQLList(GraphQLID)))).toBe('["qa-fixture-id"]');
  });

  it('handles List of NonNull items', () => {
    expect(fixtureLiteralForType(new GraphQLList(new GraphQLNonNull(GraphQLBoolean)))).toBe('[true]');
  });
});

describe('fixtureLiteralForType — enum', () => {
  it('returns the first enum value name', () => {
    const StatusEnum = new GraphQLEnumType({
      name: 'Status',
      values: { ACTIVE: {}, INACTIVE: {}, PENDING: {} },
    });
    expect(fixtureLiteralForType(StatusEnum)).toBe('ACTIVE');
  });

  it('handles a single-value enum', () => {
    const SingleEnum = new GraphQLEnumType({ name: 'Flag', values: { ON: {} } });
    expect(fixtureLiteralForType(SingleEnum)).toBe('ON');
  });
});

describe('fixtureLiteralForType — input object', () => {
  it('returns an object literal with only required (NonNull) fields', () => {
    const Input = new GraphQLInputObjectType({
      name: 'FindInput',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },          // optional — excluded
      },
    });
    expect(fixtureLiteralForType(Input)).toBe('{ id: "qa-fixture-id" }');
  });

  it('returns an empty object literal when all fields are optional', () => {
    const Input = new GraphQLInputObjectType({
      name: 'FilterInput',
      fields: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
    });
    expect(fixtureLiteralForType(Input)).toBe('{  }');
  });

  it('includes multiple required fields separated by commas', () => {
    const Input = new GraphQLInputObjectType({
      name: 'AuthInput',
      fields: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        remember: { type: GraphQLBoolean },     // optional — excluded
      },
    });
    expect(fixtureLiteralForType(Input)).toBe('{ username: "qa-fixture", password: "qa-fixture" }');
  });

  it('recurses into nested NonNull fields within an input object', () => {
    const Input = new GraphQLInputObjectType({
      name: 'CountInput',
      fields: {
        total: { type: new GraphQLNonNull(GraphQLInt) },
      },
    });
    expect(fixtureLiteralForType(Input)).toBe('{ total: 1 }');
  });
});
