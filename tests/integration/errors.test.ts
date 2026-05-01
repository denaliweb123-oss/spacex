import API from "../../src/api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { createProductionApolloServer } from "../../src/graphql/server";
import { server as mswServer, simulateHttpError } from "../mocks/msw.server";
import { SpaceXService } from "../../src/services/SpaceXService";

const server = createProductionApolloServer({
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(() => server.stop());
const api = new API();
const contextValue = { api, spacexService: new SpaceXService(api) };

describe("Error handling", () => {
  it("returns a GraphQL error for an unknown field", async () => {
    const res = await server.executeOperation(
      { query: `{ doesNotExist }` },
      { contextValue }
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
    expect((res.body as any).singleResult.errors.length).toBeGreaterThan(0);
  });

  it("returns a GraphQL error for invalid syntax", async () => {
    const res = await server.executeOperation(
      { query: `{ launches { ` },
      { contextValue }
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("returns null data (not a thrown error) when a resolver returns null", async () => {
    simulateHttpError(404, 'https://api.spacexdata.com/v5/launches/missing');

    const res = await server.executeOperation(
      { query: `{ launch(id: "missing") { id } }` },
      { contextValue }
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launch).toBeNull();
  });

  it("masks internal error message — raw cause does not reach the client", async () => {
    simulateHttpError(500, 'https://api.spacexdata.com/v4/launches');

    const res = await server.executeOperation(
      { query: `{ launches { id } }` },
      { contextValue: { api } } as any
    );
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toBe("Internal server error");
  });
});
