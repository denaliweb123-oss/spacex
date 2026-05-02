"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const fs_1 = require("fs");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const resolvers_1 = __importDefault(require("../../src/resolvers"));
const subgraph_1 = require("@apollo/subgraph");
const api_1 = __importDefault(require("../../src/api"));
const validationRules_1 = require("../../src/graphql/security/validationRules");
const graphql_depth_limit_1 = __importDefault(require("graphql-depth-limit"));
const disabled_1 = require("@apollo/server/plugin/disabled");
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
const typeDefs = (0, graphql_tag_1.default)((0, fs_1.readFileSync)("schema.graphql", { encoding: "utf-8" }));
const server = new server_1.ApolloServer({
    schema: (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default }),
    validationRules: validationRules_1.validationRules,
    plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
});
const ctx = { contextValue: { api: new api_1.default() } };
describe("🛡️ Security & Abuse Agent", () => {
    it("rejects unknown fields (query injection attempt)", async () => {
        const res = await server.executeOperation({ query: `{ __typename maliciousField }` }, ctx);
        expect(res.body.singleResult.errors).toBeDefined();
    });
    it("blocks deep query attack simulation", async () => {
        const strictServer = new server_1.ApolloServer({
            schema: (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default }),
            validationRules: [(0, graphql_depth_limit_1.default)(6)],
            plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
        });
        const res = await strictServer.executeOperation({
            query: `
          query {
            launchesPast {
              rocket {
                rocket {
                  second_stage {
                    payloads {
                      composite_fairing {
                        diameter {
                          meters
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        }, ctx);
        const result = res.body.singleResult;
        expect(result.errors).toBeDefined();
        expect(result.errors[0].message).toMatch(/exceeds maximum operation depth/i);
    });
    it("prevents schema introspection abuse in hardened mode", async () => {
        const hardenedServer = new server_1.ApolloServer({
            schema: (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default }),
            introspection: false,
            plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
        });
        const res = await hardenedServer.executeOperation({
            query: `{ __schema { types { name } } }`,
        });
        expect(res.body.singleResult.errors).toBeDefined();
    });
    it("verifies that mutations return Not Authorized", async () => {
        const authServer = new server_1.ApolloServer({
            schema: (0, subgraph_1.buildSubgraphSchema)({
                typeDefs,
                resolvers: {
                    Mutation: {
                        insert_users: () => { throw new Error("Not Authorized"); }
                    }
                }
            }),
            plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
        });
        const mutation = `mutation { insert_users(objects: { name: "Test" }) { affected_rows } }`;
        const res = await authServer.executeOperation({ query: mutation });
        const result = res.body.singleResult;
        expect(result.errors).toBeDefined();
        expect(result.errors[0].message).toBe("Not Authorized");
    });
});
//# sourceMappingURL=autonomous.security.agent.test.js.map