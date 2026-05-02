import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import gql from 'graphql-tag';
import resolvers from '../../../src/resolvers';
import API from '../../../src/api';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';

jest.mock('../../../src/api');

const typeDefs = gql(readFileSync('schema.graphql', { encoding: 'utf-8' }));
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  return new API() as jest.Mocked<API>;
}
function ctx(api: jest.Mocked<API>) {
  return { contextValue: { api } };
}

describe('Ships — find branch and shipsResult resolver', () => {
  const RAW_SHIP = { ship_id: 'S1', ship_name: 'GO Ms Tree', active: true };

  it('ships calls queryShips when find filter is provided', async () => {
    const api = mockApi();
    api.queryShips.mockResolvedValue({ data: [RAW_SHIP], result: { totalCount: 1 } } as any);
    const res = await server.executeOperation(
      { query: `{ ships(find: { name: "GO Ms Tree" }) { id name } }` },
      ctx(api)
    );
    expect(api.queryShips).toHaveBeenCalled();
    expect(api.getShips).not.toHaveBeenCalled();
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.ships).toHaveLength(1);
  });

  it('ships calls getShips when no find filter is provided', async () => {
    const api = mockApi();
    api.getShips.mockResolvedValue([RAW_SHIP] as any);
    const res = await server.executeOperation(
      { query: `{ ships { id name } }` },
      ctx(api)
    );
    expect(api.getShips).toHaveBeenCalled();
    expect(api.queryShips).not.toHaveBeenCalled();
    expect((res.body as any).singleResult.data.ships).toHaveLength(1);
  });

  it('shipsResult returns data array and totalCount', async () => {
    const api = mockApi();
    api.queryShips.mockResolvedValue({ data: [RAW_SHIP], result: { totalCount: 1 } } as any);
    const res = await server.executeOperation(
      { query: `{ shipsResult { data { id } result { totalCount } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    const sr = (res.body as any).singleResult.data.shipsResult;
    expect(sr.data).toHaveLength(1);
    expect(sr.result.totalCount).toBe(1);
  });

  it('shipsResult handles null queryShips response', async () => {
    const api = mockApi();
    api.queryShips.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ shipsResult { data { id } result { totalCount } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.shipsResult.data).toEqual([]);
  });
});
