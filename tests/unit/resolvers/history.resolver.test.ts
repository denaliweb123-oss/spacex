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

describe('History — historiesResult resolver', () => {
  it('returns totalCount 0 when queryHistoryEvent returns null', async () => {
    const api = mockApi();
    api.queryHistoryEvent.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ historiesResult { result { totalCount } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.historiesResult.result.totalCount).toBe(0);
  });

  it('returns data and totalCount when queryHistoryEvent returns results', async () => {
    const api = mockApi();
    api.queryHistoryEvent.mockResolvedValue([{ id: '1', title: 'First Launch' }] as any);
    const res = await server.executeOperation(
      { query: `{ historiesResult { result { totalCount } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.historiesResult.result.totalCount).toBe(1);
  });
});

describe('History.flight resolver', () => {
  const RAW_HISTORY = { id: '1', title: 'First Launch', flight_number: 1 };
  const RAW_LAUNCH = { id: 'launch1', name: 'FalconSat' };

  it('returns the first launch when queryNextLaunch returns results', async () => {
    const api = mockApi();
    api.getHistoryEvents.mockResolvedValue([RAW_HISTORY] as any);
    api.queryNextLaunch.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ histories { flight { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    const histories = (res.body as any).singleResult.data.histories;
    expect(histories[0].flight.id).toBe('launch1');
  });

  it('returns null when queryNextLaunch returns empty array', async () => {
    const api = mockApi();
    api.getHistoryEvents.mockResolvedValue([RAW_HISTORY] as any);
    api.queryNextLaunch.mockResolvedValue([] as any);
    const res = await server.executeOperation(
      { query: `{ histories { flight { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.histories[0].flight).toBeNull();
  });

  it('returns null when queryNextLaunch returns null', async () => {
    const api = mockApi();
    api.getHistoryEvents.mockResolvedValue([RAW_HISTORY] as any);
    api.queryNextLaunch.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ histories { flight { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.histories[0].flight).toBeNull();
  });
});
