import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { createProductionApolloServer } from "../../src/graphql/server";
import API from "../../src/api";
import { SpaceXService } from "../../src/services/SpaceXService";

describe("E2E: Full GraphQL Flow", () => {
  const api = new API();
  const contextValue = { api, spacexService: new SpaceXService(api) };
  const server = createProductionApolloServer({
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });

  afterAll(async () => server.stop());

  it("executes a launches query end-to-end via MSW-intercepted REST API", async () => {
    const res = await server.executeOperation(
      { query: `{ launches { id mission_name } }` },
      { contextValue }
    );
    const { data, errors } = (res.body as any).singleResult;
    expect(errors).toBeUndefined();
    expect(data.launches).toBeInstanceOf(Array);
  });

  it("returns null for an unknown launch id", async () => {
    const res = await server.executeOperation(
      { query: `{ launch(id: "does-not-exist") { id } }` },
      { contextValue }
    );
    const { data, errors } = (res.body as any).singleResult;
    expect(errors).toBeUndefined();
    expect(data.launch).toBeNull();
  });
});
