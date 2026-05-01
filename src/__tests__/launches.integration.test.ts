import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

jest.mock("../api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const server = new ApolloServer({ schema: buildSubgraphSchema({ typeDefs, resolvers }) });

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  return new API() as jest.Mocked<API>;
}

const RAW_LAUNCH = {
  id: "launch1",
  name: "Starlink-15",           // REST v4 field → mission_name
  date_utc: "2021-10-09T00:30:00.000Z",
  date_local: "2021-10-09T01:30:00+01:00",
  date_unix: 1633736049,
  upcoming: false,
  launch_success: true,
  rocket: { rocket_name: "Falcon 9", rocket_type: "FT" },
  links: null,
};

describe("Launches integration — end-to-end resolver pipeline", () => {
  it("returns mission_name mapped from REST name field", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { mission_name } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launches[0].mission_name).toBe("Starlink-15");
  });

  it("returns correct launch_year derived from date_local", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { launch_year } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.data.launches[0].launch_year).toBe("2021");
  });

  it("returns correct launch_date_unix from REST date_unix", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { launch_date_unix } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.data.launches[0].launch_date_unix).toBe(1633736049);
  });

  it("applies limit pagination to the launches list", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH, RAW_LAUNCH, RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches(limit: 2) { id } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.data.launches).toHaveLength(2);
  });

  it("applies offset pagination to the launches list", async () => {
    const launches = [
      { ...RAW_LAUNCH, id: "a" },
      { ...RAW_LAUNCH, id: "b" },
      { ...RAW_LAUNCH, id: "c" },
    ];
    const api = mockApi();
    api.getLaunches.mockResolvedValue(launches as any);
    const res = await server.executeOperation(
      { query: `{ launches(offset: 2) { id } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.data.launches[0].id).toBe("c");
  });

  it("returns null for links when REST links field is null", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([{ ...RAW_LAUNCH, links: null }] as any);
    const res = await server.executeOperation(
      { query: `{ launches { links { article_link } } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launches[0].links).toBeNull();
  });

  it("returns null ships when launch has no ships field", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([{ id: "launch1", name: "TestFlight" }] as any);
    const res = await server.executeOperation(
      { query: `{ launches { id ships { id } } }` },
      { contextValue: { api } }
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launches[0].ships).toBeNull();
  });

  it("parseShip transformation flows end-to-end through the ships resolver", async () => {
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
    expect(ship.id).toBe("GOMSCHIEF");
    expect(ship.name).toBe("GO MS CHIEF");
    expect(ship.type).toBe("High Speed Craft");
    expect(ship.active).toBe(true);
  });
});
