import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import { http, HttpResponse } from "msw";
import resolvers from "../../src/resolvers";
import API from "../../src/api";
import { server as mswServer } from "../mocks/msw.server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: gql(readFileSync("schema.graphql", { encoding: "utf-8" })),
    resolvers,
  }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(async () => await server.stop());

const ctx = (api = new API()) => ({ contextValue: { api } as any });

describe("Deprecated fields — regression guard", () => {
  it("Capsule.dragon returns without throwing (field is deprecated, upstream returns null)", async () => {
    // Provide a mock capsule — no dragon field, simulating the deprecated upstream.
    mswServer.use(
      http.get("https://api.spacexdata.com/v4/capsules/C201", () =>
        HttpResponse.json({ id: "C201", serial: "C201", status: "active", type: "Dragon 1.1" })
      )
    );
    const res = await server.executeOperation(
      { query: `{ capsule(id: "C201") { id dragon { id } } }` },
      ctx()
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    // dragon resolves to null — deprecated, no upstream data. No runtime exception.
    expect(result.data.capsule.id).toBe("C201");
    expect(result.data.capsule.dragon).toBeNull();
  });

  it("Query.missions is @deprecated but returns an array without errors", async () => {
    const res = await server.executeOperation(
      { query: `{ missions { id name } }` },
      ctx()
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data.missions)).toBe(true);
  });

  it("Query.mission is @deprecated but resolves a single item without errors", async () => {
    const res = await server.executeOperation(
      { query: `{ mission(id: "F3364BF") { id name } }` },
      ctx()
    );
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    // Returns null when upstream has no data — acceptable for deprecated endpoint.
    expect(result.data).toHaveProperty("mission");
  });

  it("deprecated fields appear in schema introspection with a deprecation reason", async () => {
    const res = await server.executeOperation({
      query: `{
        __type(name: "Capsule") {
          fields(includeDeprecated: true) {
            name
            isDeprecated
            deprecationReason
          }
        }
      }`,
    }, ctx());
    const fields: any[] = (res.body as any).singleResult.data.__type.fields;
    const dragonField = fields.find((f: any) => f.name === "dragon");
    expect(dragonField).toBeDefined();
    expect(dragonField.isDeprecated).toBe(true);
    expect(dragonField.deprecationReason).toMatch(/MongoDB/i);
  });
});
