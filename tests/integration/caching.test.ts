import API from "../../src/api";
import { SpaceXService } from "../../src/services/SpaceXService";
import { createProductionApolloServer } from "../../src/graphql/server";

const server = createProductionApolloServer();
afterAll(async () => await server.stop());

describe("Cache-Control headers", () => {
  it("sets Cache-Control: max-age=86400 on a successful query response", async () => {
    const api = new API();
    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id mission_name } }` },
      { contextValue: { api, spacexService: new SpaceXService(api) } }
    );

    expect((res.body as any).singleResult.errors).toBeUndefined();
    const cacheControl = res.http.headers.get("Cache-Control");
    expect(cacheControl).toMatch(/max-age=86400/);
  });

  it("does not set a permissive cache header on an error response", async () => {
    const api = new API();
    const res = await server.executeOperation(
      { query: `{ launches { nonExistentField } }` },
      { contextValue: { api, spacexService: new SpaceXService(api) } }
    );

    // A response with a validation error should not be cached for 24 hours.
    const cacheControl = res.http.headers.get("Cache-Control");
    expect(cacheControl).not.toMatch(/max-age=86400/);
  });
});
