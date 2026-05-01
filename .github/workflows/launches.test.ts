import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import resolvers from "../../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import API from "../../api";

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
    resolvers,
  }),
});

describe("Launches Integration Tests", () => {
  it("fetches a list of launches with missions and rockets", async () => {
    const query = `
      query GetLaunches {
        launches(limit: 2) {
          id
          mission_name
          rocket {
            rocket_name
          }
        }
      }
    `;

    const res = await server.executeOperation(
      { query },
      { contextValue: { api: new API() } }
    );

    expect(res.body.kind).toBe("single");
    const data = (res.body as any).singleResult.data;
    expect(data.launches.length).toBeLessThanOrEqual(2);
  });
});