import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import API from "../../src/api";

jest.mock("../../src/api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getLaunches: () => Promise.resolve([]),
    getPastLaunches: () => Promise.resolve([]),
    getLaunch: () => Promise.resolve(null),
    getRockets: () => Promise.resolve([]),
    getRocket: () => Promise.resolve(null),
    getCapsules: () => Promise.resolve([]),
    getCapsule: () => Promise.resolve(null),
    getShips: () => Promise.resolve([]),
    getShip: () => Promise.resolve(null),
    getLaunchPads: () => Promise.resolve([]),
    getLaunchPad: () => Promise.resolve(null),
    getDragons: () => Promise.resolve([]),
    getDragon: () => Promise.resolve(null),
    getCores: () => Promise.resolve([]),
    getCore: () => Promise.resolve(null),
    getPayloads: () => Promise.resolve([]),
    getPayload: () => Promise.resolve(null),
    getLandpads: () => Promise.resolve([]),
    getLandpad: () => Promise.resolve(null),
    getHistoryEvents: () => Promise.resolve([]),
    getHistoryEvent: () => Promise.resolve(null),
    company: () => Promise.resolve(null),
    getRoadster: () => Promise.resolve(null),
    getLatestLaunch: () => Promise.resolve(null),
    getUpcomingLaunchs: () => Promise.resolve([]),
    getNextLaunch: () => Promise.resolve(null),
    queryNextLaunch: () => Promise.resolve([]),
    queryRocket: () => Promise.resolve(null),
    queryShips: () => Promise.resolve(null),
    queryPayloads: () => Promise.resolve([]),
    queryHistoryEvent: () => Promise.resolve([]),
  })),
}));

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

const ctx = { contextValue: { api: new API() } };

describe("📋 Contract Agent — Schema Stability", () => {
  it("Query type exposes core resolver fields", async () => {
    const res = await server.executeOperation(
      { query: `{ __schema { queryType { fields { name } } } }` },
      ctx
    );
    const fields: string[] = (res.body as any).singleResult.data.__schema.queryType.fields.map(
      (f: { name: string }) => f.name
    );
    const required = ["launches", "launchesPast", "rockets", "capsules", "ships", "dragons"];
    for (const field of required) {
      expect(fields).toContain(field);
    }
  });

  it("Launch type declares expected fields", async () => {
    const res = await server.executeOperation(
      { query: `{ __type(name: "Launch") { fields { name } } }` },
      ctx
    );
    const fields: string[] = (res.body as any).singleResult.data.__type.fields.map(
      (f: { name: string }) => f.name
    );
    expect(fields).toContain("id");
    expect(fields).toContain("mission_name");
    expect(fields).toContain("launch_date_utc");
  });

  it("Rocket type declares expected fields", async () => {
    const res = await server.executeOperation(
      { query: `{ __type(name: "Rocket") { fields { name } } }` },
      ctx
    );
    const fields: string[] = (res.body as any).singleResult.data.__type.fields.map(
      (f: { name: string }) => f.name
    );
    expect(fields).toContain("id");
    expect(fields).toContain("name");
    expect(fields).toContain("type");
  });

  it("launchesPast resolver returns a list (contract shape)", async () => {
    const res = await server.executeOperation(
      { query: `{ launchesPast(limit: 1) { id mission_name } }` },
      ctx
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data.launchesPast)).toBe(true);
  });

  it("rockets resolver returns a list (contract shape)", async () => {
    const res = await server.executeOperation(
      { query: `{ rockets(limit: 1) { id name } }` },
      ctx
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data.rockets)).toBe(true);
  });

  it("single-item resolvers accept an id argument without error", async () => {
    const res = await server.executeOperation(
      { query: `{ rocket(id: "falcon9") { id name } }` },
      ctx
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
  });

  it("schema has no unknown types at the Query root", async () => {
    const res = await server.executeOperation(
      { query: `{ __schema { queryType { fields { name type { kind } } } } }` },
      ctx
    );
    const fields = (res.body as any).singleResult.data.__schema.queryType.fields;
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(["OBJECT", "LIST", "SCALAR", "NON_NULL"]).toContain(field.type.kind);
    }
  });
});
