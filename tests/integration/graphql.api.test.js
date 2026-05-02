"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const subgraph_1 = require("@apollo/subgraph");
const fs_1 = require("fs");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const resolvers_1 = __importDefault(require("../../src/resolvers"));
const api_1 = __importDefault(require("../../src/api"));
const launches_json_1 = __importDefault(require("../fixtures/launches.json"));
const typeDefs = (0, graphql_tag_1.default)((0, fs_1.readFileSync)("schema.graphql", { encoding: "utf-8" }));
const server = new server_1.ApolloServer({ schema: (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default }) });
afterAll(async () => await server.stop());
const RAW_LAUNCH = launches_json_1.default[0];
describe("Integration: Launches Resolver Pipeline", () => {
    it("executes full Query -> Resolver -> Transformation flow", async () => {
        const api = new api_1.default();
        const res = await server.executeOperation({ query: `{ launches { mission_name launch_year launch_date_unix } }` }, { contextValue: { api } });
        const data = res.body.singleResult.data.launches[0];
        expect(data.mission_name).toBe("FalconSat");
        expect(data.launch_year).toBe("2006");
        expect(data.launch_date_unix).toBe(1143239400);
    });
    it("validates pagination filters through the server layer", async () => {
        const api = new api_1.default();
        const res = await server.executeOperation({ query: `{ launches(limit: 1) { id } }` }, { contextValue: { api } });
        expect(res.body.singleResult.data.launches).toHaveLength(1);
    });
    it("ensures partial failures do not crash the request", async () => {
        const api = new api_1.default();
        const res = await server.executeOperation({ query: `{ launches { mission_name links { article_link } } }` }, { contextValue: { api } });
        expect(res.body.singleResult.data.launches[0].links).toBeNull();
    });
});
//# sourceMappingURL=graphql.api.test.js.map