"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("../../src/api"));
const disabled_1 = require("@apollo/server/plugin/disabled");
const server_1 = require("../../src/graphql/server");
const msw_server_1 = require("../mocks/msw.server");
const SpaceXService_1 = require("../../src/services/SpaceXService");
const server = (0, server_1.createProductionApolloServer)({
    plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
});
afterAll(() => server.stop());
const api = new api_1.default();
const contextValue = { api, spacexService: new SpaceXService_1.SpaceXService(api) };
describe("Error handling", () => {
    it("returns a GraphQL error for an unknown field", async () => {
        const res = await server.executeOperation({ query: `{ doesNotExist }` }, { contextValue });
        expect(res.body.singleResult.errors).toBeDefined();
        expect(res.body.singleResult.errors.length).toBeGreaterThan(0);
    });
    it("returns a GraphQL error for invalid syntax", async () => {
        const res = await server.executeOperation({ query: `{ launches { ` }, { contextValue });
        expect(res.body.singleResult.errors).toBeDefined();
    });
    it("returns null data (not a thrown error) when a resolver returns null", async () => {
        (0, msw_server_1.simulateHttpError)(404, 'https://api.spacexdata.com/v5/launches/missing');
        const res = await server.executeOperation({ query: `{ launch(id: "missing") { id } }` }, { contextValue });
        expect(res.body.singleResult.errors).toBeUndefined();
        expect(res.body.singleResult.data.launch).toBeNull();
    });
    it("masks internal error message — raw cause does not reach the client", async () => {
        (0, msw_server_1.simulateHttpError)(500, 'https://api.spacexdata.com/v4/launches');
        const res = await server.executeOperation({ query: `{ launches { id } }` }, { contextValue: { api } });
        const errors = res.body.singleResult.errors;
        expect(errors).toBeDefined();
        expect(errors[0].message).toBe("Internal server error");
    });
});
//# sourceMappingURL=errors.test.js.map