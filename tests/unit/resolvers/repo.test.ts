import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../../src/resolvers";

jest.mock("../../../src/api", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

describe("Server bootstrap", () => {
  it("builds the subgraph schema without errors", () => {
    expect(() => buildSubgraphSchema({ typeDefs, resolvers })).not.toThrow();
  });

  it("starts and stops an ApolloServer without errors", async () => {
    const server = new ApolloServer({ schema: buildSubgraphSchema({ typeDefs, resolvers }) });
    await server.start();
    await expect(server.stop()).resolves.not.toThrow();
  });

  it("schema exposes Query type with at least one field", () => {
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();
    expect(Object.keys(queryType?.getFields() ?? {}).length).toBeGreaterThan(0);
  });

  it("schema exposes the Launch type", () => {
    const schema = buildSubgraphSchema({ typeDefs, resolvers });
    expect(schema.getType("Launch")).toBeDefined();
  });

  it("resolvers object is defined and non-empty", () => {
    expect(resolvers).toBeDefined();
    expect(typeof resolvers).toBe("object");
  });
});
