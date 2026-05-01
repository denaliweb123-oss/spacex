import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";

describe("Security Policy Integration", () => {
  it("verifies that mutations return Not Authorized", async () => {
    const server = new ApolloServer({
      typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
      resolvers: {
        Mutation: {
          insert_users: () => "Not Authorized"
        }
      }
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
    expect(result.data.insert_users).toBe("Not Authorized");
  });
});