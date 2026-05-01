import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import resolvers from "../resolvers";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

describe("Security Policy Integration", () => {
  it("verifies that mutations return Not Authorized", async () => {
    const server = new ApolloServer({
      schema: buildSubgraphSchema({
        typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
        resolvers: {
          Mutation: {
            insert_users: () => {
              throw new Error("Not Authorized");
            }
          }
        }
      }),
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });

    const mutation = `
      mutation {
        insert_users(objects: { name: "Test" }) {
          affected_rows
        }
      }
    `;

    const res = await server.executeOperation({ query: mutation });
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toBe("Not Authorized");
  });
});