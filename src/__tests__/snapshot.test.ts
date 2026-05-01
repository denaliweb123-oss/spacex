import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import resolvers from "../resolvers";
import gql from "graphql-tag";
import API from "../api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";

jest.mock("../api");

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: gql(readFileSync("schema.graphql", "utf-8")),
    resolvers,
  }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(() => server.stop());

const MOCK_LAUNCH = {
  id: "5eb87cd9ffd86e000604b32a",
  name: "FalconSat",                             // REST v4: name → mission_name
  date_local: "2006-03-25T10:30:00+12:00",       // REST v4: date_local → launch_year
  rocket: { rocket_name: "Falcon 1", rocket_type: "Merlin A" },
};

describe("Response Shape Snapshots", () => {
  it("matches the snapshot for a complex launch query", async () => {
    const mockApi = new API() as jest.Mocked<API>;
    mockApi.getLaunch.mockResolvedValue(MOCK_LAUNCH as any);

    const res = await server.executeOperation(
      {
        query: `
          query SnapshotLaunch {
            launch(id: "5eb87cd9ffd86e000604b32a") {
              id
              mission_name
              launch_year
              rocket {
                rocket_name
                rocket_type
              }
            }
          }
        `,
      },
      { contextValue: { api: mockApi } }
    );

    const result = (res.body as any).singleResult;
    expect(result.errors).toBeUndefined();

    const launch = result.data.launch;
    expect(launch.id).toBe(MOCK_LAUNCH.id);
    expect(launch.mission_name).toBe("FalconSat");   // mapped from REST name
    expect(launch.launch_year).toBe("2006");          // sliced from date_local
    expect(launch.rocket.rocket_name).toBe("Falcon 1");
    expect(launch.rocket.rocket_type).toBe("Merlin A");

    expect(result.data).toMatchSnapshot();
  });
});
