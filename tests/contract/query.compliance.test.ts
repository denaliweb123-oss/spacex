import { validate, parse, Source } from 'graphql';
import { readFileSync } from 'fs';
import path from 'path';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

describe('Contract: Production Query Compliance', () => {
  const SCHEMA_PATH = path.resolve(__dirname, '../../schema.graphql');
  const schemaSDL = readFileSync(SCHEMA_PATH, 'utf-8');

  const schema = buildSubgraphSchema({
    typeDefs: gql(schemaSDL),
    resolvers: {}
  });

  const productionQueries = [
    {
      name: 'GetLaunches',
      query: `
        query GetLaunches {
          launches {
            mission_name
            launch_date_utc
          }
        }
      `
    }
  ];

  productionQueries.forEach(({ name, query }) => {
    it(`should validate production query "${name}" against the schema`, () => {
      const document = parse(new Source(query));
      const errors = validate(schema, document);

      if (errors.length > 0) {
        const details = errors.map(e => `[COMPLIANCE ERROR] ${e.message}`).join('\n');
        throw new Error(`Production query breakage detected for "${name}":\n${details}`);
      }

      expect(errors).toHaveLength(0);
    });
  });
});
