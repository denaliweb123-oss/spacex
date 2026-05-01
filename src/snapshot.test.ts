import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import resolvers from "../../resolvers";
import gql from "graphql-tag";
import API from "../../api";
import { buildSubgraphSchema } from "@apollo/subgraph";

describe("Response Shape Snapshots", () => {
  it("matches the snapshot for a complex launch query", async () => {
    const server = new ApolloServer({
      schema: buildSubgraphSchema({
        typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
        resolvers,
      }),
    });

    const query = `
      query SnapshotLaunch {
        launch(id: "101") {
          id
          mission_name
          launch_year
          rocket {
            rocket_name
            rocket_type
          }
        }
      }
    `;

    const res = await server.executeOperation({ query }, { contextValue: { api: new API() } });
    expect((res.body as any).singleResult.data).toMatchSnapshot();
  });
});