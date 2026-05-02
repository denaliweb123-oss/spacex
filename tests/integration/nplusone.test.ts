import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import API from "../../src/api";

jest.mock("../../src/api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

describe("Integration: N+1 Query Verification", () => {
  let server: ApolloServer;

  beforeAll(() => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });
  });

  afterAll(async () => {
    await server.stop();
  });

  it("ensures DataLoader/memoization batches requests for rockets across multiple launches", async () => {
    const api = new API() as jest.Mocked<API>;

    // Mock 3 launches, all associated with the same rocket ID
    const mockLaunches = [
      { id: "L1", rocket: "falcon9", mission_name: "Mission 1" },
      { id: "L2", rocket: "falcon9", mission_name: "Mission 2" },
      { id: "L3", rocket: "falcon9", mission_name: "Mission 3" },
    ];

    api.getLaunches.mockResolvedValue(mockLaunches as any);

    // Track the number of underlying calls to the getRocket method
    let rocketFetchCount = 0;
    api.getRocket.mockImplementation(async (id: string) => {
      rocketFetchCount++;
      return { id, name: "Falcon 9", type: "rocket" } as any;
    });

    const query = `
      query VerifyBatching {
        launches(limit: 3) {
          id
          rocket {
            rocket {
              id
              name
            }
          }
        }
      }
    `;

    const res = await server.executeOperation(
      { query },
      { contextValue: { api } }
    );

    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(result.data.launches).toHaveLength(3);

    // CRITICAL: Even though 3 launches were fetched, the rocket data 
    // for 'falcon9' should only be fetched once from the underlying REST API.
    expect(rocketFetchCount).toBe(1);
  });
});