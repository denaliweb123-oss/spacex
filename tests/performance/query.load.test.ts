import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import API from "../../src/api";

jest.mock("../../src/api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  const api = new API() as jest.Mocked<API>;
  api.getPastLaunches.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({ id: `launch-${i}`, name: `Mission ${i}` })) as any
  );
  return api;
}

describe("⚡ Performance & Resilience Agent", () => {
  it("resolves three concurrent queries in under 200 ms (in-process, no network)", async () => {
    const query = `{ launchesPast(limit: 3) { mission_name } }`;

    const start = Date.now();
    await Promise.all(
      Array.from({ length: 3 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it("handles 10 concurrent queries without errors", async () => {
    const query = `{ launchesPast(limit: 5) { id } }`;

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );

    for (const r of results) {
      expect((r.body as any).singleResult.errors).toBeUndefined();
      expect((r.body as any).singleResult.data.launchesPast).toHaveLength(5);
    }
  });

  it("each concurrent response contains the correct number of items", async () => {
    const query = `{ launchesPast(limit: 2) { id } }`;

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );

    for (const r of results) {
      expect((r.body as any).singleResult.data.launchesPast).toHaveLength(2);
    }
  });
});
