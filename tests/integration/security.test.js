"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validationRules_1 = require("../../src/graphql/security/validationRules");
const graphql_validation_complexity_1 = require("graphql-validation-complexity");
const disabled_1 = require("@apollo/server/plugin/disabled");
const server_1 = require("../../src/graphql/server");
const rateLimit_1 = require("../../src/graphql/security/rateLimit");
jest.mock("../../src/api", () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({})),
}));
const api_1 = __importDefault(require("../../src/api"));
const ctx = { contextValue: { api: new api_1.default() } };
function buildServer(opts = {}) {
    return (0, server_1.createProductionApolloServer)({
        validationRules: opts.rules ?? validationRules_1.validationRules,
        ...(opts.introspection !== undefined && { introspection: opts.introspection }),
        plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
    });
}
describe("Security — Complexity Limit", () => {
    it("allows a low-complexity query", async () => {
        const server = buildServer();
        const res = await server.executeOperation({ query: `{ rockets(limit: 1) { id name } }` }, ctx);
        const errors = res.body.singleResult.errors ?? [];
        expect(errors.find((e) => /complexity/i.test(e.message))).toBeUndefined();
    });
    it("blocks a query that exceeds the configured complexity limit", async () => {
        const strictServer = buildServer({ rules: [(0, graphql_validation_complexity_1.createComplexityLimitRule)(5)] });
        const aliases = Array.from({ length: 20 }, (_, i) => `a${i}: launches { id }`).join(" ");
        const res = await strictServer.executeOperation({ query: `{ ${aliases} }` }, ctx);
        const errors = res.body.singleResult.errors;
        expect(errors).toBeDefined();
        expect(errors[0].message).toMatch(/complexity/i);
    });
});
describe("Security — Depth Limit", () => {
    it("allows a query within the depth limit", async () => {
        const server = buildServer();
        const res = await server.executeOperation({ query: `{ launches(limit: 1) { id mission_name } }` }, ctx);
        const errors = res.body.singleResult.errors ?? [];
        expect(errors.find((e) => /depth/i.test(e.message))).toBeUndefined();
    });
    it("blocks queries exceeding the maxDepth of 8", async () => {
        const server = buildServer();
        const deepQuery = `
      query {
        launches { rocket { rocket { rocket { rocket { rocket { rocket { rocket { id } } } } } } } }
      }
    `;
        const res = await server.executeOperation({ query: deepQuery }, ctx);
        const errors = res.body.singleResult.errors;
        expect(errors).toBeDefined();
        expect(errors[0].message).toMatch(/exceeds maximum operation depth/i);
    });
    it("blocks queries exceeding maxComplexity of 1000", async () => {
        const strictServer = buildServer({ rules: [(0, graphql_validation_complexity_1.createComplexityLimitRule)(5)] });
        const res = await strictServer.executeOperation({ query: `{ launches { id } }` }, ctx);
        const errors = res.body.singleResult.errors;
        expect(errors).toBeDefined();
        expect(errors[0].message).toMatch(/complexity/i);
    });
});
describe("Security — Introspection", () => {
    it("allows introspection when enabled", async () => {
        const server = buildServer({ introspection: true });
        const res = await server.executeOperation({ query: `{ __schema { queryType { name } } }` }, ctx);
        expect(res.body.singleResult.errors).toBeUndefined();
        expect(res.body.singleResult.data.__schema).toBeDefined();
    });
    it("blocks introspection when disabled", async () => {
        const server = buildServer({ introspection: false });
        const res = await server.executeOperation({ query: `{ __schema { types { name } } }` }, ctx);
        expect(res.body.singleResult.errors).toBeDefined();
    });
    it("rejects unknown fields regardless of introspection setting", async () => {
        const server = buildServer();
        const res = await server.executeOperation({ query: `{ nonExistentField }` }, ctx);
        expect(res.body.singleResult.errors).toBeDefined();
    });
});
describe("Security — Rate Limiting", () => {
    it("correctly evaluates context for rate limiting", async () => {
        const mockContext = { ip: "127.0.0.1", headers: {} };
        const mockInfo = { fieldName: "launches", parentType: { name: "Query" } };
        await expect((0, rateLimit_1.checkRateLimit)({}, {}, mockContext, mockInfo)).resolves.not.toThrow();
    });
});
//# sourceMappingURL=security.test.js.map