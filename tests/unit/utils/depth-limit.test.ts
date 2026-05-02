import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../../src/resolvers";
import { validationRules } from "../../../src/graphql/security/validationRules";
import depthLimit from "graphql-depth-limit";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

jest.mock("../../../src/api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  validationRules,
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

function depthError(errors: any[]): any | undefined {
  return errors?.find((e: any) => e.message.includes("exceeds maximum operation depth"));
}

describe("Query Depth Limiting", () => {
  it("passes a shallow query (depth 2)", async () => {
    const res = await server.executeOperation({
      query: `{ launches(limit: 1) { id } }`,
    });
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(depthError(errors)).toBeUndefined();
  });

  it("passes a query at the production depth limit (depth 7)", async () => {
    const res = await server.executeOperation({
      query: `{
        launchesPast {
          rocket {
            rocket {
              second_stage {
                payloads {
                  composite_fairing {
                    diameter { meters }
                  }
                }
              }
            }
          }
        }
      }`,
    });
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(depthError(errors)).toBeUndefined();
  });

  it("blocks a query that exceeds the configured depth limit", async () => {
    const strictServer = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      validationRules: [depthLimit(6)],
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });
    const res = await strictServer.executeOperation({
      query: `{
        launchesPast {
          rocket {
            rocket {
              second_stage {
                payloads {
                  composite_fairing {
                    diameter { meters }
                  }
                }
              }
            }
          }
        }
      }`,
    });
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(depthError(errors)).toBeDefined();
  });

  it("does not count introspection fields toward depth", async () => {
    const res = await server.executeOperation({
      query: `{
        __schema {
          types {
            fields {
              type {
                ofType { ofType { ofType { name } } }
              }
            }
          }
        }
      }`,
    });
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(depthError(errors)).toBeUndefined();
  });

  it("counts depth through inline fragments", async () => {
    const strictServer = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      validationRules: [depthLimit(1)],
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    });
    const res = await strictServer.executeOperation({
      query: `{
        launches(limit: 1) {
          ... on Launch {
            rocket { rocket_name }
          }
        }
      }`,
    });
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(depthError(errors)).toBeDefined();
  });
});
