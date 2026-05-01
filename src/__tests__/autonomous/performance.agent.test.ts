import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import API from "../../api";

const typeDefs = gql(
  readFileSync("schema.graphql", {
    encoding: "utf-8",
  })
);

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

describe("⚡ Performance & Resilience Agent", () => {
  it("handles repeated queries efficiently (baseline check)", async () => {
    const query = `
      query {
        launchesPast(limit: 3) {
          mission_name
        }
      }
    `;

    const start = Date.now();

    await Promise.all([
      server.executeOperation(
        { query },
        { contextValue: { api: new API() } }
      ),
      server.executeOperation(
        { query },
        { contextValue: { api: new API() } }
      ),
      server.executeOperation(
        { query },
        { contextValue: { api: new API() } }
      ),
    ]);

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  it("does not crash under concurrent execution", async () => {
    const query = `{ launchesPast(limit: 5) { id } }`;

    const results = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        server.executeOperation(
          { query },
          { contextValue: { api: new API() } }
        )
      )
    );

    expect(results.every(r => !(r.body as any).singleResult.errors)).toBe(true);
  });
});