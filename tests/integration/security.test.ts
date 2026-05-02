import { validationRules } from "../../src/graphql/security/validationRules";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { createProductionApolloServer } from "../../src/graphql/server";

jest.mock("../../src/api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

import API from "../../src/api";

let ctx: any;
beforeEach(() => {
  ctx = { contextValue: { api: new API() } };
});

function buildServer(opts: { rules?: any[]; introspection?: boolean } = {}) {
  return createProductionApolloServer({
    validationRules: opts.rules ?? validationRules,
    ...(opts.introspection !== undefined && { introspection: opts.introspection }),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });
}

describe("Security — Complexity Limit", () => {
  let server: ReturnType<typeof buildServer>;
  let strictServer: ReturnType<typeof buildServer>;
  beforeAll(() => {
    server = buildServer();
    strictServer = buildServer({ rules: [createComplexityLimitRule(5)] });
  });
  afterAll(async () => {
    await server.stop();
    await strictServer.stop();
  });

  it("allows a low-complexity query", async () => {
    const res = await server.executeOperation(
      { query: `{ rockets(limit: 1) { id name } }` },
      ctx
    );
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(errors.find((e: any) => /complexity/i.test(e.message))).toBeUndefined();
  });

  it("blocks a query that exceeds the configured complexity limit", async () => {
    const aliases = Array.from({ length: 20 }, (_, i) => `a${i}: launches { id }`).join(" ");
    const res = await strictServer.executeOperation({ query: `{ ${aliases} }` }, ctx);
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toMatch(/complexity/i);
  });
});

describe("Security — Depth Limit", () => {
  let server: ReturnType<typeof buildServer>;
  let strictServer: ReturnType<typeof buildServer>;
  beforeAll(() => {
    server = buildServer();
    strictServer = buildServer({ rules: [createComplexityLimitRule(5)] });
  });
  afterAll(async () => {
    await server.stop();
    await strictServer.stop();
  });

  it("allows a query within the depth limit", async () => {
    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id mission_name } }` },
      ctx
    );
    const errors = (res.body as any).singleResult.errors ?? [];
    expect(errors.find((e: any) => /depth/i.test(e.message))).toBeUndefined();
  });

  it("blocks queries exceeding the maxDepth of 8", async () => {
    const deepQuery = `
      query {
        launches { rocket { rocket { rocket { rocket { rocket { rocket { rocket { id } } } } } } } }
      }
    `;
    const res = await server.executeOperation({ query: deepQuery }, ctx);
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toMatch(/exceeds maximum operation depth/i);
  });

  it("blocks queries exceeding maxComplexity of 1000", async () => {
    // launches { id } has list-factor cost 10; threshold 5 ensures the rule fires
    const res = await strictServer.executeOperation(
      { query: `{ launches { id } }` },
      ctx
    );
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toMatch(/complexity/i);
  });
});

describe("Security — Introspection", () => {
  let enabledServer: ReturnType<typeof buildServer>;
  let disabledServer: ReturnType<typeof buildServer>;
  let defaultServer: ReturnType<typeof buildServer>;
  beforeAll(() => {
    enabledServer = buildServer({ introspection: true });
    disabledServer = buildServer({ introspection: false });
    defaultServer = buildServer();
  });
  afterAll(async () => {
    await enabledServer.stop();
    await disabledServer.stop();
    await defaultServer.stop();
  });

  it("allows introspection when enabled", async () => {
    const res = await enabledServer.executeOperation(
      { query: `{ __schema { queryType { name } } }` },
      ctx
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.__schema).toBeDefined();
  });

  it("blocks introspection when disabled", async () => {
    const res = await disabledServer.executeOperation(
      { query: `{ __schema { types { name } } }` },
      ctx
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("rejects unknown fields regardless of introspection setting", async () => {
    const res = await defaultServer.executeOperation({ query: `{ nonExistentField }` }, ctx);
    expect((res.body as any).singleResult.errors).toBeDefined();
  });
});

