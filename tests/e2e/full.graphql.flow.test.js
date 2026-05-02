"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const disabled_1 = require("@apollo/server/plugin/disabled");
const server_1 = require("../../src/graphql/server");
const api_1 = __importDefault(require("../../src/api"));
const SpaceXService_1 = require("../../src/services/SpaceXService");
describe("E2E: Full GraphQL Flow", () => {
    const api = new api_1.default();
    const contextValue = { api, spacexService: new SpaceXService_1.SpaceXService(api) };
    const server = (0, server_1.createProductionApolloServer)({
        plugins: [(0, disabled_1.ApolloServerPluginInlineTraceDisabled)()],
    });
    afterAll(async () => server.stop());
    it("executes a launches query end-to-end via MSW-intercepted REST API", async () => {
        const res = await server.executeOperation({ query: `{ launches { id mission_name } }` }, { contextValue });
        const { data, errors } = res.body.singleResult;
        expect(errors).toBeUndefined();
        expect(data.launches).toBeInstanceOf(Array);
    });
    it("returns null for an unknown launch id", async () => {
        const res = await server.executeOperation({ query: `{ launch(id: "does-not-exist") { id } }` }, { contextValue });
        const { data, errors } = res.body.singleResult;
        expect(errors).toBeUndefined();
        expect(data.launch).toBeNull();
    });
});
//# sourceMappingURL=full.graphql.flow.test.js.map