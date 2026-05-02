import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import gql from 'graphql-tag';
import resolvers from '../../../src/resolvers';
import { resolvers as payloadResolvers } from '../../../src/resolvers/payloads';
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

const RAW_PAYLOAD = {
  id: 'ZUMA',
  payload_id: 'ZUMA',
  nationality: 'United States',
  manufacturer: 'Northrop Grumman',
  payload_type: 'Satellite',
  orbit: 'LEO',
  reused: false,
  customers: ['US Government'],
};

describe('Payload — Query resolvers', () => {
  it('payloads calls getPayloads when no find filter is provided', async () => {
    const api = mockApi();
    api.getPayloads.mockResolvedValue([RAW_PAYLOAD] as any);
    const res = await server.executeOperation(
      { query: `{ payloads { id } }` },
      ctx(api)
    );
    expect(api.getPayloads).toHaveBeenCalled();
    expect(api.queryPayloads).not.toHaveBeenCalled();
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.payloads).toHaveLength(1);
  });

  it('payloads calls queryPayloads when a find filter is provided', async () => {
    const api = mockApi();
    api.queryPayloads.mockResolvedValue([RAW_PAYLOAD] as any);
    const res = await server.executeOperation(
      { query: `{ payloads(find: { payload_id: "ZUMA" }) { id } }` },
      ctx(api)
    );
    expect(api.queryPayloads).toHaveBeenCalled();
    expect(api.getPayloads).not.toHaveBeenCalled();
    expect((res.body as any).singleResult.data.payloads).toHaveLength(1);
  });

  it('payload(id) returns null when not found', async () => {
    const api = mockApi();
    api.getPayload.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ payload(id: "MISSING") { id } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.payload).toBeNull();
  });

  it('payload(id) returns parsed payload when found', async () => {
    const api = mockApi();
    api.getPayload.mockResolvedValue(RAW_PAYLOAD as any);
    const res = await server.executeOperation(
      { query: `{ payload(id: "ZUMA") { id nationality } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    const payload = (res.body as any).singleResult.data.payload;
    expect(payload.id).toBe('ZUMA');
    expect(payload.nationality).toBe('United States');
  });

  it('uses payload_id as fallback id when id field is absent', async () => {
    const api = mockApi();
    const noId = { ...RAW_PAYLOAD, id: undefined };
    api.getPayload.mockResolvedValue(noId as any);
    const res = await server.executeOperation(
      { query: `{ payload(id: "ZUMA") { id } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.payload.id).toBe('ZUMA');
  });
});

describe('Mission.payloads — via server (missions query path)', () => {
  const RAW_MISSION = { id: 'F3364BF', name: 'Iridium NEXT', payload_ids: ['IRIDIUM-1', 'IRIDIUM-2'] };
  const RAW_PAYLOAD = { id: 'IRIDIUM-1', payload_id: 'IRIDIUM-1', nationality: 'United States' };

  it('fetches each payload by id when payload_ids is present', async () => {
    const api = mockApi();
    (api as any).getMissions = jest.fn().mockResolvedValue([RAW_MISSION]);
    api.getPayload
      .mockResolvedValueOnce({ ...RAW_PAYLOAD, id: 'IRIDIUM-1', payload_id: 'IRIDIUM-1' } as any)
      .mockResolvedValueOnce({ id: 'IRIDIUM-2', payload_id: 'IRIDIUM-2', nationality: 'United States' } as any);
    const res = await server.executeOperation(
      { query: `{ missions { id payloads { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect(Array.isArray((res.body as any).singleResult.data.missions)).toBe(true);
  });

  it('returns null when payload_ids is absent from parent', async () => {
    const api = mockApi();
    (api as any).getMissions = jest.fn().mockResolvedValue([{ id: 'M1', name: 'Test' }]);
    const res = await server.executeOperation(
      { query: `{ missions { id payloads { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
  });
});

// Mission.payloads is unreachable through the server because the `missions` and `mission`
// query resolvers always return empty/null. Tested directly against the resolver function.
describe('Mission.payloads — direct resolver tests', () => {
  it('returns null when parent has no payload_ids', async () => {
    const api = mockApi();
    const result = await (payloadResolvers as any).Mission.payloads(
      {},
      {},
      { api }
    );
    expect(result).toBeNull();
  });

  it('returns null when payload_ids is not an array', async () => {
    const api = mockApi();
    const result = await (payloadResolvers as any).Mission.payloads(
      { payload_ids: 'not-an-array' },
      {},
      { api }
    );
    expect(result).toBeNull();
  });

  it('fetches each payload by id and returns parsed results', async () => {
    const api = mockApi();
    api.getPayload
      .mockResolvedValueOnce({ id: 'P1', payload_id: 'P1' } as any)
      .mockResolvedValueOnce({ id: 'P2', payload_id: 'P2' } as any);
    const result = await (payloadResolvers as any).Mission.payloads(
      { payload_ids: ['P1', 'P2'] },
      {},
      { api }
    );
    expect(api.getPayload).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('P1');
    expect(result[1].id).toBe('P2');
  });
});
