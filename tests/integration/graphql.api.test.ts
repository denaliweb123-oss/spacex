import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import API from "../../src/api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(async () => await server.stop());

describe("Integration: Launches Resolver Pipeline", () => {
  it("executes full Query -> Resolver -> Transformation flow", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches { mission_name launch_year launch_date_unix } }` },
      { contextValue: { api } }
    );

    const data = (res.body as any).singleResult.data.launches[0];
    expect(data.mission_name).toBe("FalconSat");
    expect(data.launch_year).toBe("2006");
    expect(data.launch_date_unix).toBe(1143239400);
  });

  it("validates pagination filters through the server layer", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id } }` },
      { contextValue: { api } }
    );

    expect((res.body as any).singleResult.data.launches).toHaveLength(1);
  });

  it("ensures partial failures do not crash the request", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches { mission_name links { article_link } } }` },
      { contextValue: { api } }
    );

    expect((res.body as any).singleResult.data.launches[0].links).toBeNull();
  });

  // Risk #2 from docs/test-strategy.md: every list resolver accepts an optional limit/offset
  // but enforces no schema-level cap. Omitting limit returns the full upstream dataset.
  // This test documents and gates that behavior — any resolver regression that silently drops
  // items or throws on an unbounded call will fail here.
  it("returns all fixture items when limit is omitted (unbounded — open risk documented in test-strategy.md)", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches { id } }` },
      { contextValue: { api } }
    );

    const data = (res.body as any).singleResult.data.launches;
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect(Array.isArray(data)).toBe(true);
    // The MSW fixture contains multiple launches; all are returned with no limit.
    expect(data.length).toBeGreaterThan(1);
  });
});
