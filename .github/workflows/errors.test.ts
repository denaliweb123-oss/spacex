import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import resolvers from "../../resolvers";
import gql from "graphql-tag";

describe("Error Handling & Masking Integration", () => {
  it("masks stack traces in production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const server = new ApolloServer({
      typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
      resolvers: {
        Query: {
          launches: () => { throw new Error("Internal DB Failure"); }
        }
      },
    });

    const res = await server.executeOperation({
      query: "{ launches { id } }"
    });

    expect(res.body.kind).toBe("single");
    const result = (res.body as any).singleResult;
    
    // In production, the message might be masked or at least the stacktrace extension should be gone
    const error = result.errors[0];
    expect(error.extensions?.stacktrace).toBeUndefined();
    
    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });
});