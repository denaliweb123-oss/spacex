import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
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
});

describe("🔗 Contract & Resolver Agent", () => {
  it("validates launches query contract shape", async () => {
    const res = await server.executeOperation({
      query: `
        query {
          launchesPast(limit: 1) {
            id
            mission_name
            launch_date_local
          }
        }
      `,
    }, {
      contextValue: { api: new API() }
    });

    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(result.data?.launchesPast[0]).toHaveProperty("mission_name");
  });

  it("ensures null safety for optional fields", async () => {
    const res = await server.executeOperation({
      query: `
        query {
          launchesPast(limit: 5) {
            rocket {
              rocket_name
            }
          }
        }
      `,
    }, {
      contextValue: { api: new API() }
    });

    expect((res.body as any).singleResult.errors).toBeUndefined();
  });
});