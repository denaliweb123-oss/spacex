import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import { validationRules } from "../graphql/security/validationRules";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

jest.mock("../api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const ctx = { contextValue: { api: new (require("../api").default)() } };

function buildServer(opts: { rules?: any[]; introspection?: boolean } = {}) {
  return new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    validationRules: opts.rules ?? validationRules,
    ...(opts.introspection !== undefined && { introspection: opts.introspection }),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });
}

describe("Security — Complexity Limit", () => {
  it("allows a low-complexity query", async () => {
    const server = buildServer();
    const res = await server.executeOperation(
      { query: `{ rockets(limit: 1) { id name } }` },
      ctx
    );
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(errors.find((e: any) => /complexity/i.test(e.message))).toBeUndefined();
  });

  it("blocks a query that exceeds the configured complexity limit", async () => {
    // Low threshold to verify the rule fires without needing 1000+ cost queries
    const strictServer = buildServer({ rules: [createComplexityLimitRule(5)] });
    const aliases = Array.from({ length: 20 }, (_, i) => `a${i}: launches { id }`).join(" ");
    const res = await strictServer.executeOperation({ query: `{ ${aliases} }` }, ctx);
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toMatch(/complexity/i);
  });
});

describe("Security — Depth Limit", () => {
  it("allows a query within the depth limit", async () => {
    const server = buildServer();
    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id mission_name } }` },
      ctx
    );
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(errors.find((e: any) => /depth/i.test(e.message))).toBeUndefined();
  });
});

describe("Security — Introspection", () => {
  it("allows introspection when enabled", async () => {
    const server = buildServer({ introspection: true });
    const res = await server.executeOperation(
      { query: `{ __schema { queryType { name } } }` },
      ctx
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.__schema).toBeDefined();
  });

  it("blocks introspection when disabled", async () => {
    const server = buildServer({ introspection: false });
    const res = await server.executeOperation(
      { query: `{ __schema { types { name } } }` },
      ctx
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("rejects unknown fields regardless of introspection setting", async () => {
    const server = buildServer();
    const res = await server.executeOperation({ query: `{ nonExistentField }` }, ctx);
    expect((res.body as any).singleResult.errors).toBeDefined();
  });
});
