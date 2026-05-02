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
const disabled_1 = require("@apollo/server/plugin/disabled");
const api_1 = __importDefault(require("../../src/api"));
jest.mock("../../src/api");
const typeDefs = (0, graphql_tag_1.default)((0, fs_1.readFileSync)("schema.graphql", { encoding: "utf-8" }));
const server = new server_1.ApolloServer({
    schema: (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default }),
    plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
});
afterAll(() => server.stop());
function mockApi() {
    const api = new api_1.default();
    api.getPastLaunches.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ id: `launch-${i}`, name: `Mission ${i}` })));
    return api;
}
describe("⚡ Performance & Resilience Agent", () => {
    it("resolves three concurrent queries in under 200 ms (in-process, no network)", async () => {
        const query = `{ launchesPast(limit: 3) { mission_name } }`;
        const start = Date.now();
        await Promise.all(Array.from({ length: 3 }, () => server.executeOperation({ query }, { contextValue: { api: mockApi() } })));
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(200);
    });
    it("handles 10 concurrent queries without errors", async () => {
        const query = `{ launchesPast(limit: 5) { id } }`;
        const results = await Promise.all(Array.from({ length: 10 }, () => server.executeOperation({ query }, { contextValue: { api: mockApi() } })));
        for (const r of results) {
            expect(r.body.singleResult.errors).toBeUndefined();
            expect(r.body.singleResult.data.launchesPast).toHaveLength(5);
        }
    });
    it("each concurrent response contains the correct number of items", async () => {
        const query = `{ launchesPast(limit: 2) { id } }`;
        const results = await Promise.all(Array.from({ length: 5 }, () => server.executeOperation({ query }, { contextValue: { api: mockApi() } })));
        for (const r of results) {
            expect(r.body.singleResult.data.launchesPast).toHaveLength(2);
        }
    });
});
//# sourceMappingURL=query.load.test.js.map