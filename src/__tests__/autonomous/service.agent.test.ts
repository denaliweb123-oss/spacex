import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../resolvers";
import API from "../../api";

// Integration tests: verify that parse-service and limit-offset-service
// transform data correctly as it flows through real GraphQL resolvers.
// Unit tests for those functions live in parse-service.test.ts and
// limit-offset-service.test.ts — this file tests the resolver pipeline.

jest.mock("../../api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  return new API() as jest.Mocked<API>;
}

describe("🧪 Service Integration Agent", () => {
  it("parseShip output flows correctly through the ships resolver", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([
      { id: "launch1", name: "TestFlight", ships: [{ ship_id: "GOMSCHIEF" }] },
    ] as any);
    api.getShip.mockResolvedValue({
      ship_id: "GOMSCHIEF",
      ship_name: "GO MS CHIEF",
      ship_type: "High Speed Craft",
      active: true,
      weight_kg: 500,
    } as any);

    const res = await server.executeOperation(
      { query: `{ launches { ships { id name type active } } }` },
      { contextValue: { api } }
    );

    const ship = (res.body as any).singleResult.data.launches[0].ships[0];
    expect(ship.id).toBe("GOMSCHIEF");   // ship_id → id
    expect(ship.name).toBe("GO MS CHIEF"); // ship_name → name
    expect(ship.type).toBe("High Speed Craft"); // ship_type → type
    expect(ship.active).toBe(true);
  });

  it("pagination via the launches resolver respects limit and offset", async () => {
    const api = mockApi();
    const allLaunches = Array.from({ length: 10 }, (_, i) => ({
      id: `launch-${i}`,
      name: `Mission ${i}`,
    }));
    api.getLaunches.mockResolvedValue(allLaunches as any);

    const page1Res = await server.executeOperation(
      { query: `{ launches(limit: 3, offset: 0) { id } }` },
      { contextValue: { api } }
    );
    const page2Res = await server.executeOperation(
      { query: `{ launches(limit: 3, offset: 3) { id } }` },
      { contextValue: { api } }
    );

    const page1 = (page1Res.body as any).singleResult.data.launches;
    const page2 = (page2Res.body as any).singleResult.data.launches;
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
    expect(page1[0].id).toBe("launch-0");
    expect(page2[0].id).toBe("launch-3");
  });

  it("returns null ships when launch has no ships field", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([{ id: "launch1", name: "TestFlight" }] as any);

    const res = await server.executeOperation(
      { query: `{ launches { id ships { id } } }` },
      { contextValue: { api } }
    );

    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();
    expect(result.data.launches[0].ships).toBeNull();
  });

  it("field resolver mappings are applied end-to-end through the resolver chain", async () => {
    const api = mockApi();
    api.getPastLaunches.mockResolvedValue([
      {
        id: "abc",
        name: "Starlink-1",
        date_utc: "2019-05-24T02:30:00.000Z",
        date_local: "2019-05-23T22:30:00-04:00",
        date_unix: 1558665000,
        rocket: { rocket_name: "Falcon 9", rocket_type: "Block 5" },
      },
    ] as any);

    const res = await server.executeOperation(
      {
        query: `{
          launchesPast(limit: 1) {
            mission_name
            launch_date_utc
            launch_date_unix
            launch_year
          }
        }`,
      },
      { contextValue: { api } }
    );

    const launch = (res.body as any).singleResult.data.launchesPast[0];
    expect(launch.mission_name).toBe("Starlink-1");
    expect(launch.launch_date_utc).toBe("2019-05-24T02:30:00.000Z");
    expect(launch.launch_date_unix).toBe(1558665000);
    expect(launch.launch_year).toBe("2019");
  });
});
