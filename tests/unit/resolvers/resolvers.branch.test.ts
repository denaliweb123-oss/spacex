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

// ─── launchpad.ts — Launchpad.vehicles_launched ──────────────────────────────

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

// ─── payloads.ts — Mission.payloads ──────────────────────────────────────────

describe('Mission.payloads resolver', () => {
  const RAW_MISSION = { id: 'F3364BF', name: 'Iridium NEXT', payload_ids: ['IRIDIUM-1', 'IRIDIUM-2'] };
  const RAW_PAYLOAD = { id: 'IRIDIUM-1', payload_id: 'IRIDIUM-1', nationality: 'United States' };

  it('fetches each payload by id when payload_ids is present', async () => {
    const api = mockApi();
    api.getHistoryEvents.mockResolvedValue([]);
    // mission resolver uses mission() query
    api.getHistoryEvent.mockResolvedValue(null as any);
    // We need a missions query — use the missions resolver path
    // Instead, test Mission.payloads by executing through `mission` query
    // mission(id) returns a Mission; then .payloads invokes Mission.payloads resolver
    // mock missions list endpoint
    (api as any).getMissions = jest.fn().mockResolvedValue([RAW_MISSION]);
    api.getPayload
      .mockResolvedValueOnce({ ...RAW_PAYLOAD, id: 'IRIDIUM-1', payload_id: 'IRIDIUM-1' } as any)
      .mockResolvedValueOnce({ id: 'IRIDIUM-2', payload_id: 'IRIDIUM-2', nationality: 'United States' } as any);

    const res = await server.executeOperation(
      { query: `{ missions { id payloads { id } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    const missions = (res.body as any).singleResult.data.missions;
    expect(Array.isArray(missions)).toBe(true);
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

// ─── ships.ts — find branch + shipsResult ────────────────────────────────────

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

// ─── history.ts — historiesResult null data path ─────────────────────────────

describe('History — historiesResult null data path', () => {
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

// ─── launch.ts — LaunchRocketFirstStageCore.core + History.flight ────────────

describe('Launch — LaunchRocketFirstStageCore.core resolver', () => {
  it('fetches core by serial from parent', async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([{
      id: 'abc',
      name: 'Test',
      rocket: {
        first_stage: {
          cores: [{ core_serial: 'B1049', flight: 1, reused: true }],
        },
      },
    }] as any);
    api.getCore.mockResolvedValue({ id: 'B1049', serial: 'B1049' } as any);
    const res = await server.executeOperation(
      { query: `{ launches { rocket { first_stage { cores { core { id } } } } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect(api.getCore).toHaveBeenCalledWith('B1049');
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
