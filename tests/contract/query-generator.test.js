"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subgraph_1 = require("@apollo/subgraph");
const graphql_1 = require("graphql");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const fs_1 = require("fs");
const resolvers_1 = __importDefault(require("../../src/resolvers"));
const query_generator_1 = require("../../src/qa/generators/query-generator");
const typeDefs = (0, graphql_tag_1.default)((0, fs_1.readFileSync)("schema.graphql", "utf-8"));
const schema = (0, subgraph_1.buildSubgraphSchema)({ typeDefs, resolvers: resolvers_1.default });
const resolverFields = new Set(Object.keys(resolvers_1.default.Query ?? {}));
describe("Autonomous query generation", () => {
    const queries = (0, query_generator_1.generateQueries)(schema, resolverFields);
    it("generates queries for required-argument root fields", () => {
        expect(queries).toEqual(expect.arrayContaining([
            expect.stringMatching(/\bcapsule\(id: "qa-fixture-id"\)/),
            expect.stringMatching(/\blaunch\(id: "qa-fixture-id"\)/),
            expect.stringMatching(/\brocket\(id: "qa-fixture-id"\)/),
            expect.stringMatching(/\bship\(id: "qa-fixture-id"\)/),
        ]));
    });
    it("generates only syntactically and schema-valid queries", () => {
        for (const query of queries) {
            expect((0, graphql_1.validate)(schema, (0, graphql_1.parse)(query))).toEqual([]);
        }
    });
});
//# sourceMappingURL=query-generator.test.js.map