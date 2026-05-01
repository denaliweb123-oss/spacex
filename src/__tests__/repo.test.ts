import { ApolloServer, ContextFunction } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import API from "../api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

// Mock the API class to provide deterministic data and avoid network timeouts
jest.mock("../api");

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: gql(
      readFileSync("schema.graphql", {
        encoding: "utf-8",
      })
    ),
    resolvers,
  }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

// Properly tear down the server to prevent resource leaks and open handles
afterAll(async () => {
  await server.stop();
});

describe("Repository Template Functionality", () => {
  it("Executes Location Entity Resolver", async () => {
    const mockApi = new API() as jest.Mocked<API>;
    //Arrange
    const query = `query Capsules {
      capsules {
        id
      }
    }`;
    const variables = {
      representations: [{ __typename: "Thing", id: "1" }],
    };
    const expected = { 
      id: "5e9e2c5bf35918ed873b2664",
    };

    // Mock the API response to be deterministic
    mockApi.getCapsules.mockResolvedValue([expected] as any);

    //Act
    const res = await server.executeOperation(
      {
        query,
        variables,
      },
      { contextValue: { api: mockApi } }
    );
    //Assert
    expect(res.body.kind).toEqual("single");
    expect((res.body as any).singleResult.data.capsules[0]).toEqual(expected);
  });
});
