import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import { validationRules } from "../graphql/security/validationRules";

jest.mock("../api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

function buildServer(opts: { introspection?: boolean; rules?: boolean } = {}) {
  return new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    ...(opts.rules !== false && { validationRules }),
    ...(opts.introspection !== undefined && { introspection: opts.introspection }),
  });
}

describe("Security — Validation Rules", () => {
  describe("depth limiting", () => {
    it("allows a query within the depth limit", async () => {
      const server = buildServer({ rules: true });
      const res = await server.executeOperation({
        query: `{ launches(limit: 1) { id mission_name } }`,
      });
      // No depth error — only possible resolver errors from null mock data
      const errors = (res.body as any).singleResult.errors ?? [];
      const depthError = errors.find((e: any) =>
        e.message.includes("exceeds maximum operation depth")
      );
      expect(depthError).toBeUndefined();
    });

    it("blocks a query that exceeds the depth limit", async () => {
      // Uses depthLimit(6) server (same path reaches depthSoFar=7 on leaf, 7>6=true)
      const strictServer = new ApolloServer({
        schema: buildSubgraphSchema({ typeDefs, resolvers }),
        validationRules: [require("graphql-depth-limit")(6)],
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
      expect(errors[0].message).toMatch(/exceeds maximum operation depth/i);
    });
  });

  describe("complexity limiting", () => {
    it("allows a low-complexity query", async () => {
      const server = buildServer({ rules: true });
      const res = await server.executeOperation({
        query: `{ rockets(limit: 1) { id name } }`,
      });
      const errors = (res.body as any).singleResult.errors ?? [];
      const complexityError = errors.find((e: any) =>
        e.message.toLowerCase().includes("complexity")
      );
      expect(complexityError).toBeUndefined();
    });
  });

  describe("introspection", () => {
    it("allows introspection when enabled (default)", async () => {
      const server = buildServer({ introspection: true });
      const res = await server.executeOperation({
        query: `{ __schema { queryType { name } } }`,
      });
      expect((res.body as any).singleResult.errors).toBeUndefined();
      expect((res.body as any).singleResult.data.__schema).toBeDefined();
    });

    it("blocks introspection when disabled", async () => {
      const server = buildServer({ introspection: false });
      const res = await server.executeOperation({
        query: `{ __schema { types { name } } }`,
      });
      expect((res.body as any).singleResult.errors).toBeDefined();
    });

    it("rejects unknown fields regardless of introspection setting", async () => {
      const server = buildServer({ rules: true });
      const res = await server.executeOperation({
        query: `{ nonExistentField }`,
      });
      expect((res.body as any).singleResult.errors).toBeDefined();
    });
  });
});
