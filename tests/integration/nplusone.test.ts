import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import API from "../../src/api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

jest.mock("../../src/api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

describe("Integration: N+1 Query Verification", () => {
  let server: ApolloServer;

  beforeAll(() => {
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      plugins: [ApolloServerPluginInlineTraceDisabled()],
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

  // Ships do NOT have a request cache in the Launch resolver — each ship ID in each
  // launch triggers a separate getShip call. This test documents the open N+1 risk
  // for ships and acts as a regression guard: if a cache is ever added, rocketFetchCount
  // will drop to 1 and this test should be updated to assert 1.
  it("documents N+1 for ships: getShip is called once per launch (no memoization)", async () => {
    const api = new API() as jest.Mocked<API>;
    const sharedShipId = "GO_Ms_Tree";

    const mockLaunches = [
      { id: "L1", ships: [{ ship_id: sharedShipId }], mission_name: "Mission 1" },
      { id: "L2", ships: [{ ship_id: sharedShipId }], mission_name: "Mission 2" },
      { id: "L3", ships: [{ ship_id: sharedShipId }], mission_name: "Mission 3" },
    ];

    api.getLaunches.mockResolvedValue(mockLaunches as any);

    let shipFetchCount = 0;
    api.getShip.mockImplementation(async (id: string) => {
      shipFetchCount++;
      return { ship_id: id, name: "GO Ms. Tree", type: "Cargo" } as any;
    });

    const query = `
      query VerifyShipN1 {
        launches(limit: 3) {
          id
          ships { id name }
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

    // Ships have no memoization: 3 launches × 1 ship each = 3 calls.
    // If this drops to 1, a cache has been added — update the assertion and remove this comment.
    expect(shipFetchCount).toBe(3);
  });
});