import { readFileSync } from 'fs';
import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import resolvers from './resolvers';

export const schema = buildSubgraphSchema({
  typeDefs: gql(readFileSync('schema.graphql', { encoding: 'utf-8' })),
  resolvers,
});
