import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

// Load the schema definition
const typeDefs = gql(
  readFileSync("schema.graphql", {
    encoding: "utf-8",
  })
);

function buildServer() {
  return new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    // Introspection should be enabled for these tests
    plugins: [ApolloServerPluginInlineTraceDisabled()],
    introspection: true,
  });
}

describe("🧩 Schema Integrity Agent", () => {
  it("detects missing root query fields", async () => {
    const server = buildServer();

    const res = await server.executeOperation({
      query: `{ __schema { queryType { fields { name } } } }`,
    });

    expect(res.body.kind).toBe("single");
    expect((res.body as any).singleResult.data.__schema.queryType.fields.length).toBeGreaterThan(0);
  });

  it("ensures schema does not break introspection structure", async () => {
    const server = buildServer();

    const res = await server.executeOperation({
      query: `{ __type(name: "Query") { name } }`,
    });

    expect(res.body.kind).toBe("single");
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.__type.name).toBe("Query");
// Moved to src/__tests__/autonomous/ to match internal relative paths
  });
});