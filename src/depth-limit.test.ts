import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import depthLimit from "graphql-depth-limit";
import { buildSubgraphSchema } from "@apollo/subgraph";
import resolvers from "../../resolvers";

describe("Query Depth Protection", () => {
  it("rejects queries exceeding a safe depth limit", async () => {
    // Implementation of §3: Security - maxDepth: 5
    const server = new ApolloServer({
      schema: buildSubgraphSchema({
        typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
        resolvers,
      }),
      validationRules: [depthLimit(5)] 
    });

    const deeplyNestedQuery = `
      query {
        launches {
          rocket {
            second_stage {
              payloads {
                manufacturer
                payload_type
                orbit
              }
            }
          }
        }
      }
    `;

    const res = await server.executeOperation({ query: deeplyNestedQuery });
    
    expect(res.body.kind).toBe("single");
    const result = (res.body as any).singleResult;

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain(
      "exceeds maximum operation depth of 5"
    );
  });
});