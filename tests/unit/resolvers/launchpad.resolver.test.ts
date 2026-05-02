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

describe('Launchpad — vehicles_launched resolver', () => {
  const RAW_LAUNCHPAD = { id: 'KSC_LC_39A', full_name: 'KSC LC 39A', status: 'active' };

  it('returns null when vehicles_launched is absent', async () => {
    const api = mockApi();
    api.getLaunchPad.mockResolvedValue({ ...RAW_LAUNCHPAD } as any);
    const res = await server.executeOperation(
      { query: `{ launchpad(id: "KSC_LC_39A") { vehicles_launched { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launchpad.vehicles_launched).toBeNull();
  });

  it('returns rocket for each name when queryRocket finds a result', async () => {
    const api = mockApi();
    api.getLaunchPad.mockResolvedValue({ ...RAW_LAUNCHPAD, vehicles_launched: ['Falcon 9'] } as any);
    api.queryRocket.mockResolvedValue({
      result: { totalCount: 1 },
      data: [{ id: 'falcon9', name: 'Falcon 9' }],
    } as any);
    const res = await server.executeOperation(
      { query: `{ launchpad(id: "KSC_LC_39A") { vehicles_launched { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    const launched = (res.body as any).singleResult.data.launchpad.vehicles_launched;
    expect(launched).toHaveLength(1);
    expect(launched[0].id).toBe('falcon9');
  });

  it('returns null entry when queryRocket reports totalCount 0', async () => {
    const api = mockApi();
    api.getLaunchPad.mockResolvedValue({ ...RAW_LAUNCHPAD, vehicles_launched: ['Unknown'] } as any);
    api.queryRocket.mockResolvedValue({ result: { totalCount: 0 }, data: [] } as any);
    const res = await server.executeOperation(
      { query: `{ launchpad(id: "KSC_LC_39A") { vehicles_launched { id } } }` },
      ctx(api)
    );
    const launched = (res.body as any).singleResult.data.launchpad.vehicles_launched;
    expect(launched).toHaveLength(1);
    expect(launched[0]).toBeNull();
  });

  it('returns null entry when queryRocket returns null', async () => {
    const api = mockApi();
    api.getLaunchPad.mockResolvedValue({ ...RAW_LAUNCHPAD, vehicles_launched: ['Falcon Heavy'] } as any);
    api.queryRocket.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ launchpad(id: "KSC_LC_39A") { vehicles_launched { id } } }` },
      ctx(api)
    );
    const launched = (res.body as any).singleResult.data.launchpad.vehicles_launched;
    expect(launched).toHaveLength(1);
    expect(launched[0]).toBeNull();
  });
});
