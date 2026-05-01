import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { createProductionApolloServer } from "../../../src/graphql/server";

describe("Production Apollo server factory", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("disables introspection by default in production", async () => {
    process.env.NODE_ENV = "production";
    const server = createProductionApolloServer({
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });

    const res = await server.executeOperation({
      query: `{ __schema { queryType { name } } }`,
    });

    expect((res.body as any).singleResult.errors).toBeDefined();
    await server.stop();
  });

  it("applies production error formatting", async () => {
    const server = createProductionApolloServer({
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });

    const res = await server.executeOperation(
      { query: `{ launches { id } }` },
      {
        contextValue: {
          api: {
            getLaunches: () => Promise.reject(new Error("database password leaked")),
          } as any,
        },
      } as any
    );

    const errors = (res.body as any).singleResult.errors;
    expect(errors[0].message).toBe("Internal server error");
    expect(JSON.stringify(errors)).not.toContain("database password leaked");
    await server.stop();
  });
});
