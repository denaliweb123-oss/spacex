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

function ctx(api: jest.Mocked<API>) {
  return { contextValue: { api } };
}

const RAW_LAUNCH = {
  id: "abc123",
  name: "Starlink-15",
  date_utc: "2021-10-09T00:30:00.000Z",
  date_local: "2021-10-09T01:30:00+01:00",
  date_unix: 1633736049,
  upcoming: false,
  launch_success: true,
  rocket: { rocket_name: "Falcon 9", rocket_type: "FT" },
  links: {
    article: "https://example.com/article",
    webcast: "https://youtube.com/watch?v=abc",
    flickr: { original: ["https://img.example.com/1.jpg"] },
    reddit: { campaign: "r/campaign", launch: "r/launch", media: "r/media", recovery: "r/recovery" },
  },
};

describe("Launches — Query Resolvers", () => {
  it("launches returns a paginated list", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH, RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches).toHaveLength(1);
  });

  it("launchesPast delegates to getPastLaunches", async () => {
    const api = mockApi();
    api.getPastLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launchesPast(limit: 1) { id } }` },
      ctx(api)
    );
    expect(api.getPastLaunches).toHaveBeenCalled();
    expect((res.body as any).singleResult.data.launchesPast).toHaveLength(1);
  });

  it("launch by id delegates to getLaunch", async () => {
    const api = mockApi();
    api.getLaunch.mockResolvedValue(RAW_LAUNCH as any);
    const res = await server.executeOperation(
      { query: `{ launch(id: "abc123") { id } }` },
      ctx(api)
    );
    expect(api.getLaunch).toHaveBeenCalledWith("abc123");
    expect((res.body as any).singleResult.data.launch.id).toBe("abc123");
  });

  it("launch returns null when id is not found", async () => {
    const api = mockApi();
    api.getLaunch.mockResolvedValue(null as any);
    const res = await server.executeOperation(
      { query: `{ launch(id: "missing") { id } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launch).toBeNull();
  });

  it("launchLatest delegates to getLatestLaunch", async () => {
    const api = mockApi();
    api.getLatestLaunch.mockResolvedValue(RAW_LAUNCH as any);
    const res = await server.executeOperation(
      { query: `{ launchLatest { id } }` },
      ctx(api)
    );
    expect(api.getLatestLaunch).toHaveBeenCalled();
    expect((res.body as any).singleResult.data.launchLatest.id).toBe("abc123");
  });

  it("accepts a variable for the launch id and coerces it correctly", async () => {
    const api = mockApi();
    api.getLaunch.mockResolvedValue(RAW_LAUNCH as any);
    const res = await server.executeOperation(
      {
        query: `query GetLaunch($id: ID!) { launch(id: $id) { id mission_name } }`,
        variables: { id: "abc123" },
      },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect(api.getLaunch).toHaveBeenCalledWith("abc123");
    expect((res.body as any).singleResult.data.launch.mission_name).toBe("Starlink-15");
  });

  it("returns a variable coercion error when a required variable is omitted", async () => {
    const api = mockApi();
    const res = await server.executeOperation(
      {
        query: `query GetLaunch($id: ID!) { launch(id: $id) { id } }`,
        variables: {},
      },
      ctx(api)
    );
    const errors = (res.body as any).singleResult.errors;
    expect(errors).toBeDefined();
    expect(errors[0].message).toMatch(/variable.*id/i);
    expect(api.getLaunch).not.toHaveBeenCalled();
  });

  it("accepts a nullable variable and applies it as pagination limit", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH, RAW_LAUNCH, RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      {
        query: `query GetLaunches($limit: Int) { launches(limit: $limit) { id } }`,
        variables: { limit: 2 },
      },
      ctx(api)
    );
    expect((res.body as any).singleResult.errors).toBeUndefined();
    expect((res.body as any).singleResult.data.launches).toHaveLength(2);
  });
});

describe("Launches — Field Resolver Mappings (REST v4 → GraphQL)", () => {
  it("maps REST name → mission_name", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { mission_name } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches[0].mission_name).toBe("Starlink-15");
  });

  it("maps REST date_utc → launch_date_utc", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { launch_date_utc } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches[0].launch_date_utc).toBe(RAW_LAUNCH.date_utc);
  });

  it("maps REST date_unix → launch_date_unix", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { launch_date_unix } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches[0].launch_date_unix).toBe(RAW_LAUNCH.date_unix);
  });

  it("derives launch_year from date_local", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { launch_year } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches[0].launch_year).toBe("2021");
  });

  it("maps links fields from REST shape", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([RAW_LAUNCH] as any);
    const res = await server.executeOperation(
      { query: `{ launches { links { article_link video_link flickr_images reddit_campaign } } }` },
      ctx(api)
    );
    const links = (res.body as any).singleResult.data.launches[0].links;
    expect(links.article_link).toBe("https://example.com/article");
    expect(links.video_link).toBe("https://youtube.com/watch?v=abc");
    expect(links.flickr_images).toEqual(["https://img.example.com/1.jpg"]);
    expect(links.reddit_campaign).toBe("r/campaign");
  });

  it("returns null links when launch has no links", async () => {
    const api = mockApi();
    api.getLaunches.mockResolvedValue([{ ...RAW_LAUNCH, links: null }] as any);
    const res = await server.executeOperation(
      { query: `{ launches { links { article_link } } }` },
      ctx(api)
    );
    expect((res.body as any).singleResult.data.launches[0].links).toBeNull();
  });
});
