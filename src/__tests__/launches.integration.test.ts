import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

// Mock the API class to provide deterministic data for integration tests
jest.mock("../api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

describe("🚀 Launches Integration Tests", () => {
  let server: ApolloServer;
  let mockApi: jest.Mocked<API>;

  beforeAll(() => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });
  });

  beforeEach(() => {
    mockApi = new API() as jest.Mocked<API>;
  });

  it("fetches a list of launches with nested rocket information", async () => {
    // Arrange: Mock the specific API response
    const mockLaunches = [
      {
        id: "101",
        name: "Starlink-15", // resolver maps parent.name → mission_name
        rocket: { rocket_name: "Falcon 9", rocket_type: "v1.2" },
      },
    ];
    mockApi.getLaunches.mockResolvedValue(mockLaunches as any);

    const query = `
      query GetLaunches {
        launches(limit: 1) {
          id
          mission_name
          rocket {
            rocket_name
          }
        }
      }
    `;

    // Act: Execute operation against the server
    const res = await server.executeOperation(
      { query },
      { contextValue: { api: mockApi } }
    );

    // Assert
    expect(res.body.kind).toBe("single");
    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(result.data.launches[0].mission_name).toBe("Starlink-15");
    expect(result.data.launches[0].rocket.rocket_name).toBe("Falcon 9");
  });

  it("returns null and handles errors gracefully when a launch is not found", async () => {
    mockApi.getLaunch.mockResolvedValue(null as any);

    const query = `{ launch(id: "non-existent") { id mission_name } }`;

    const res = await server.executeOperation(
      { query },
      { contextValue: { api: mockApi } }
    );

    expect(res.body.kind).toBe("single");
    const result = (res.body as any).singleResult;
    expect(result.data.launch).toBeNull();
  });
});