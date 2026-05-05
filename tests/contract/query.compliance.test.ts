import { validate, parse, Source } from 'graphql';
import { readFileSync } from 'fs';
import path from 'path';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { addMocksToSchema } from '@graphql-tools/mock';
import { mockCustomScalars } from '@apollo/graphql-testing-library';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';
import gql from 'graphql-tag';

// ─── Schema + server setup ────────────────────────────────────────────────────
// buildSubgraphSchema handles federation directives (@link).
// addMocksToSchema replaces all resolvers with auto-generated values so each
// query executes without a real API — every non-null field gets a mock value.
// mockCustomScalars supplies resolvers for Date, ObjectID, timestamptz, uuid;
// without them @graphql-tools/mock throws "No mock defined for type X".

const SCHEMA_PATH = path.resolve(__dirname, '../../schema.graphql');
const typeDefs = gql(readFileSync(SCHEMA_PATH, 'utf-8'));
const federationSchema = buildSubgraphSchema({ typeDefs, resolvers: {} });
const autoMockedSchema = addMocksToSchema({
  schema: federationSchema,
  mocks: mockCustomScalars(federationSchema),
});

// Validate-only schema (same build chain, no mocks needed for static checks).
const validateSchema = federationSchema;

let server: ApolloServer;
beforeAll(() => {
  server = new ApolloServer({
    schema: autoMockedSchema,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });
});
afterAll(() => server.stop());

// ─── Assertion helpers ────────────────────────────────────────────────────────

function assertValid(name: string, query: string): void {
  const errors = validate(validateSchema, parse(new Source(query, name)));
  if (errors.length > 0) {
    const details = errors.map(e => `  [COMPLIANCE ERROR] ${e.message}`).join('\n');
    throw new Error(`Production query breakage detected for "${name}":\n${details}`);
  }
  expect(errors).toHaveLength(0);
}

async function assertExecutes(name: string, query: string): Promise<void> {
  const res = await server.executeOperation({ query }, { contextValue: {} });
  const result = (res.body as any).singleResult;
  if (result.errors) {
    const msgs = result.errors.map((e: any) => e.message).join('; ');
    throw new Error(`Runtime execution failed for "${name}": ${msgs}`);
  }
  // data must be non-null — a null here means a non-nullable root field propagated null up,
  // which indicates a type violation that parse+validate cannot detect.
  expect(result.data).not.toBeNull();
}

async function assertContract(name: string, query: string): Promise<void> {
  assertValid(name, query);
  await assertExecutes(name, query);
}

// ─── List resolvers (16) ──────────────────────────────────────────────────────

describe('Contract: list resolvers', () => {
  it('launches', () => assertContract('GetLaunches',
    `query GetLaunches { launches(limit: 1) { id mission_name launch_date_utc launch_year } }`));

  it('launchesPast', () => assertContract('GetLaunchesPast',
    `query GetLaunchesPast { launchesPast(limit: 1) { id mission_name launch_success } }`));

  it('launchesUpcoming', () => assertContract('GetLaunchesUpcoming',
    `query GetLaunchesUpcoming { launchesUpcoming(limit: 1) { id mission_name launch_date_utc } }`));

  it('capsules', () => assertContract('GetCapsules',
    `query GetCapsules { capsules(limit: 1) { id status type reuse_count } }`));

  it('capsulesPast', () => assertContract('GetCapsulesPast',
    `query GetCapsulesPast { capsulesPast(limit: 1) { id status type } }`));

  it('capsulesUpcoming', () => assertContract('GetCapsulesUpcoming',
    `query GetCapsulesUpcoming { capsulesUpcoming(limit: 1) { id status type } }`));

  it('cores', () => assertContract('GetCores',
    `query GetCores { cores(limit: 1) { id status reuse_count } }`));

  it('coresPast', () => assertContract('GetCoresPast',
    `query GetCoresPast { coresPast(limit: 1) { id status reuse_count } }`));

  it('coresUpcoming', () => assertContract('GetCoresUpcoming',
    `query GetCoresUpcoming { coresUpcoming(limit: 1) { id status } }`));

  it('dragons', () => assertContract('GetDragons',
    `query GetDragons { dragons(limit: 1) { id name active } }`));

  it('histories', () => assertContract('GetHistories',
    `query GetHistories { histories(limit: 1) { id title details event_date_utc } }`));

  it('landpads', () => assertContract('GetLandpads',
    `query GetLandpads { landpads(limit: 1) { id full_name status landing_type } }`));

  it('launchpads', () => assertContract('GetLaunchpads',
    `query GetLaunchpads { launchpads(limit: 1) { id name status attempted_launches } }`));

  it('payloads', () => assertContract('GetPayloads',
    `query GetPayloads { payloads(limit: 1) { id payload_type orbit } }`));

  it('rockets', () => assertContract('GetRockets',
    `query GetRockets { rockets(limit: 1) { id name type active } }`));

  it('ships', () => assertContract('GetShips',
    `query GetShips { ships(limit: 1) { id name type status home_port } }`));
});

// ─── Single-item resolvers (12) ───────────────────────────────────────────────

describe('Contract: single-item resolvers', () => {
  it('launch(id)', () => assertContract('GetLaunch',
    `query GetLaunch { launch(id: "x") { id mission_name launch_date_utc launch_year launch_success } }`));

  it('launchLatest', () => assertContract('GetLaunchLatest',
    `query GetLaunchLatest { launchLatest { id mission_name launch_date_utc } }`));

  it('launchNext', () => assertContract('GetLaunchNext',
    `query GetLaunchNext { launchNext { id mission_name launch_date_utc } }`));

  it('capsule(id)', () => assertContract('GetCapsule',
    `query GetCapsule { capsule(id: "x") { id status type reuse_count landings } }`));

  it('core(id)', () => assertContract('GetCore',
    `query GetCore { core(id: "x") { id status reuse_count block water_landing } }`));

  it('dragon(id)', () => assertContract('GetDragon',
    `query GetDragon { dragon(id: "x") { id name active description } }`));

  it('history(id)', () => assertContract('GetHistory',
    `query GetHistory { history(id: "x") { id title details event_date_utc } }`));

  it('landpad(id)', () => assertContract('GetLandpad',
    `query GetLandpad { landpad(id: "x") { id full_name status landing_type details } }`));

  it('launchpad(id)', () => assertContract('GetLaunchpad',
    `query GetLaunchpad { launchpad(id: "x") { id name status details attempted_launches successful_launches } }`));

  it('payload(id)', () => assertContract('GetPayload',
    `query GetPayload { payload(id: "x") { id payload_type payload_mass_kg orbit nationality manufacturer } }`));

  it('rocket(id)', () => assertContract('GetRocket',
    `query GetRocket { rocket(id: "x") { id name type active description } }`));

  it('ship(id)', () => assertContract('GetShip',
    `query GetShip { ship(id: "x") { id name type status home_port active } }`));
});

// ─── Singleton resolvers (2) ──────────────────────────────────────────────────

describe('Contract: singleton resolvers', () => {
  it('company', () => assertContract('GetCompany',
    `query GetCompany { company { name ceo coo cto founder founded employees valuation summary } }`));

  it('roadster', () => assertContract('GetRoadster',
    `query GetRoadster { roadster { name details launch_date_utc earth_distance_km mars_distance_km } }`));
});

// ─── Result-envelope resolvers (4) ────────────────────────────────────────────

describe('Contract: result-envelope resolvers', () => {
  it('launchesPastResult', () => assertContract('GetLaunchesPastResult',
    `query GetLaunchesPastResult { launchesPastResult(limit: 1) { data { id mission_name } result { totalCount } } }`));

  it('historiesResult', () => assertContract('GetHistoriesResult',
    `query GetHistoriesResult { historiesResult(limit: 1) { data { id title } result { totalCount } } }`));

  it('rocketsResult', () => assertContract('GetRocketsResult',
    `query GetRocketsResult { rocketsResult(limit: 1) { data { id name } result { totalCount } } }`));

  it('shipsResult', () => assertContract('GetShipsResult',
    `query GetShipsResult { shipsResult(limit: 1) { data { id name } result { totalCount } } }`));
});

// ─── Deprecated resolvers (3) ─────────────────────────────────────────────────
// These fields are deprecated upstream but must still parse, validate, and execute
// without errors — breaking them is a contract violation for existing clients.

describe('Contract: deprecated resolvers', () => {
  it('missions (deprecated)', () => assertContract('GetMissions',
    `query GetMissions { missions(limit: 1) { id name description wikipedia } }`));

  it('mission(id) (deprecated)', () => assertContract('GetMission',
    `query GetMission { mission(id: "x") { id name description } }`));

  it('missionsResult (deprecated)', () => assertContract('GetMissionsResult',
    `query GetMissionsResult { missionsResult(limit: 1) { data { id name } result { totalCount } } }`));
});
