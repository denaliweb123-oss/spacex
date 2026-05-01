import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import depthLimit from "graphql-depth-limit";
import { buildSubgraphSchema } from "@apollo/subgraph";
import resolvers from "../resolvers";
import API from "../api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

jest.mock("../api");

describe("Query Depth Protection", () => {
  it("rejects queries exceeding a safe depth limit", async () => {
    const mockApi = new API() as jest.Mocked<API>;
    mockApi.getLaunches.mockResolvedValue([]);

    const server = new ApolloServer({
      schema: buildSubgraphSchema({
        typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
        resolvers,
      }),
      plugins: [ApolloServerPluginInlineTraceDisabled()],
      validationRules: [depthLimit(5)] 
    });

    const deeplyNestedQuery = `
      query {
        launches {
          rocket {
            rocket {
              second_stage {
                payloads {
                  orbit_params {
                    periapsis_km
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await server.executeOperation(
      { query: deeplyNestedQuery },
      { contextValue: { api: mockApi } }
    );
    
    expect(res.body.kind).toBe("single");
    const result = (res.body as any).singleResult;

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain(
      "exceeds maximum operation depth of 5"
    );
  });
});