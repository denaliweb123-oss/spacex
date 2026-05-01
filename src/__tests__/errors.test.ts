import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import API from "../api";
import { formatError } from "../graphql/security/errorFormatter";

jest.mock("../api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  formatError,
});

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  return new API() as jest.Mocked<API>;
}

describe("Error handling", () => {
  it("returns a GraphQL error for an unknown field", async () => {
    const api = mockApi();
    const res = await server.executeOperation(
      { query: `{ doesNotExist }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
    expect((res.body as any).singleResult.errors.length).toBeGreaterThan(0);
  });

  it("returns a GraphQL error for invalid syntax", async () => {
    const api = mockApi();
    const res = await server.executeOperation(
      { query: `{ launches { ` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("returns null data (not a thrown error) when a resolver returns null", async () => {
    const api = mockApi();
    api.getLaunch.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ launch(id: "missing") { id } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launch).toBeNull();
  });

  it("masks internal error message — raw cause does not reach the client", async () => {
    const api = mockApi();
    api.getLaunches.mockRejectedValue(new Error("Internal DB failure: connection timeout"));
    const res = await server.executeOperation(
      { query: `{ launches { id } }` },
      { contextValue: { api } }
    );
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toBe("Internal server error");
    expect(JSON.stringify(errors)).not.toContain("connection timeout");
    expect(JSON.stringify(errors)).not.toContain("Internal DB failure");
  });
});
