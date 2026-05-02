import { validate, parse, Source } from 'graphql';
import { readFileSync } from 'fs';
import path from 'path';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const SCHEMA_PATH = path.resolve(__dirname, '../../schema.graphql');
const schema = buildSubgraphSchema({
  typeDefs: gql(readFileSync(SCHEMA_PATH, 'utf-8')),
  resolvers: {},
});

function assertValid(name: string, query: string): void {
  const errors = validate(schema, parse(new Source(query, name)));
  if (errors.length > 0) {
    const details = errors.map(e => `  [COMPLIANCE ERROR] ${e.message}`).join('\n');
    throw new Error(`Production query breakage detected for "${name}":\n${details}`);
  }
  expect(errors).toHaveLength(0);
}

// ─── List resolvers ───────────────────────────────────────────────────────────

describe('Contract: list resolvers', () => {
  it('launches', () => assertValid('GetLaunches',
    `query GetLaunches { launches(limit: 1) { id mission_name launch_date_utc launch_year } }`));

  it('launchesPast', () => assertValid('GetLaunchesPast',
    `query GetLaunchesPast { launchesPast(limit: 1) { id mission_name launch_success } }`));

  it('launchesUpcoming', () => assertValid('GetLaunchesUpcoming',
    `query GetLaunchesUpcoming { launchesUpcoming(limit: 1) { id mission_name launch_date_utc } }`));

  it('capsules', () => assertValid('GetCapsules',
    `query GetCapsules { capsules(limit: 1) { id status type reuse_count } }`));

  it('capsulesPast', () => assertValid('GetCapsulesPast',
    `query GetCapsulesPast { capsulesPast(limit: 1) { id status type } }`));

  it('capsulesUpcoming', () => assertValid('GetCapsulesUpcoming',
    `query GetCapsulesUpcoming { capsulesUpcoming(limit: 1) { id status type } }`));

  it('cores', () => assertValid('GetCores',
    `query GetCores { cores(limit: 1) { id status reuse_count } }`));

  it('coresPast', () => assertValid('GetCoresPast',
    `query GetCoresPast { coresPast(limit: 1) { id status reuse_count } }`));

  it('coresUpcoming', () => assertValid('GetCoresUpcoming',
    `query GetCoresUpcoming { coresUpcoming(limit: 1) { id status } }`));

  it('dragons', () => assertValid('GetDragons',
    `query GetDragons { dragons(limit: 1) { id name active } }`));

  it('histories', () => assertValid('GetHistories',
    `query GetHistories { histories(limit: 1) { id title details event_date_utc } }`));

  it('landpads', () => assertValid('GetLandpads',
    `query GetLandpads { landpads(limit: 1) { id full_name status landing_type } }`));

  it('launchpads', () => assertValid('GetLaunchpads',
    `query GetLaunchpads { launchpads(limit: 1) { id name status attempted_launches } }`));

  it('payloads', () => assertValid('GetPayloads',
    `query GetPayloads { payloads(limit: 1) { id payload_type orbit } }`));

  it('rockets', () => assertValid('GetRockets',
    `query GetRockets { rockets(limit: 1) { id name type active } }`));

  it('ships', () => assertValid('GetShips',
    `query GetShips { ships(limit: 1) { id name type status home_port } }`));
});

// ─── Single-item resolvers ────────────────────────────────────────────────────

describe('Contract: single-item resolvers', () => {
  it('launch(id)', () => assertValid('GetLaunch',
    `query GetLaunch { launch(id: "x") { id mission_name launch_date_utc launch_year launch_success } }`));

  it('launchLatest', () => assertValid('GetLaunchLatest',
    `query GetLaunchLatest { launchLatest { id mission_name launch_date_utc } }`));

  it('launchNext', () => assertValid('GetLaunchNext',
    `query GetLaunchNext { launchNext { id mission_name launch_date_utc } }`));

  it('capsule(id)', () => assertValid('GetCapsule',
    `query GetCapsule { capsule(id: "x") { id status type reuse_count landings } }`));

  it('core(id)', () => assertValid('GetCore',
    `query GetCore { core(id: "x") { id status reuse_count block water_landing } }`));

  it('dragon(id)', () => assertValid('GetDragon',
    `query GetDragon { dragon(id: "x") { id name active description } }`));

  it('history(id)', () => assertValid('GetHistory',
    `query GetHistory { history(id: "x") { id title details event_date_utc } }`));

  it('landpad(id)', () => assertValid('GetLandpad',
    `query GetLandpad { landpad(id: "x") { id full_name status landing_type details } }`));

  it('launchpad(id)', () => assertValid('GetLaunchpad',
    `query GetLaunchpad { launchpad(id: "x") { id name status details attempted_launches successful_launches } }`));

  it('payload(id)', () => assertValid('GetPayload',
    `query GetPayload { payload(id: "x") { id payload_type payload_mass_kg orbit nationality manufacturer } }`));

  it('rocket(id)', () => assertValid('GetRocket',
    `query GetRocket { rocket(id: "x") { id name type active description } }`));

  it('ship(id)', () => assertValid('GetShip',
    `query GetShip { ship(id: "x") { id name type status home_port active } }`));
});

// ─── Singleton resolvers ──────────────────────────────────────────────────────

describe('Contract: singleton resolvers', () => {
  it('company', () => assertValid('GetCompany',
    `query GetCompany { company { name ceo coo cto founder founded employees valuation summary } }`));

  it('roadster', () => assertValid('GetRoadster',
    `query GetRoadster { roadster { name details launch_date_utc earth_distance_km mars_distance_km } }`));
});

// ─── Result-envelope resolvers ────────────────────────────────────────────────

describe('Contract: result-envelope resolvers', () => {
  it('launchesPastResult', () => assertValid('GetLaunchesPastResult',
    `query GetLaunchesPastResult { launchesPastResult(limit: 1) { data { id mission_name } result { totalCount } } }`));

  it('historiesResult', () => assertValid('GetHistoriesResult',
    `query GetHistoriesResult { historiesResult(limit: 1) { data { id title } result { totalCount } } }`));

  it('rocketsResult', () => assertValid('GetRocketsResult',
    `query GetRocketsResult { rocketsResult(limit: 1) { data { id name } result { totalCount } } }`));

  it('shipsResult', () => assertValid('GetShipsResult',
    `query GetShipsResult { shipsResult(limit: 1) { data { id name } result { totalCount } } }`));
});

// ─── Deprecated resolvers (still must parse and validate) ────────────────────

describe('Contract: deprecated resolvers', () => {
  it('missions (deprecated)', () => assertValid('GetMissions',
    `query GetMissions { missions(limit: 1) { id name description wikipedia } }`));

  it('mission(id) (deprecated)', () => assertValid('GetMission',
    `query GetMission { mission(id: "x") { id name description } }`));

  it('missionsResult (deprecated)', () => assertValid('GetMissionsResult',
    `query GetMissionsResult { missionsResult(limit: 1) { data { id name } result { totalCount } } }`));
});
