import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import API from "../../src/api";
import { validationRules } from "../../src/graphql/security/validationRules";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

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

// Scope: adversarial / abuse scenarios that go beyond deterministic rule checks.
// Deterministic security rules (depth, complexity, introspection, rate limit) are
// owned by tests/integration/security.test.ts and tests/unit/utils/depth-limit.test.ts.
const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

describe("🛡️ Security & Abuse Agent", () => {
  let server: ApolloServer;
  let authServer: ApolloServer;
  const ctx = { contextValue: { api: new API() } };

  beforeAll(() => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      validationRules,
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });
    authServer = new ApolloServer({
      schema: buildSubgraphSchema({
        typeDefs,
        resolvers: {
          Mutation: {
            insert_users: () => { throw new Error("Not Authorized"); },
          },
        },
      }),
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });
  });

  afterAll(async () => {
    await Promise.all([server, authServer].map(s => s.stop()));
  });

  it("rejects unknown fields (query injection attempt)", async () => {
    const res = await server.executeOperation(
      { query: `{ __typename maliciousField }` },
      ctx
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("verifies that mutations return Not Authorized", async () => {
    const mutation = `mutation { insert_users(objects: { name: "Test" }) { affected_rows } }`;
    const res = await authServer.executeOperation({ query: mutation });
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toBe("Not Authorized");
  });
});
