import API from "../../src/api";
import { server as mswServer } from "../mocks/msw.server";
import { http, HttpResponse } from "msw";

const BASE = "https://api.spacexdata.com";

describe("API", () => {
  let api: API;

  beforeEach(() => {
    api = new API();
  });

  it("constructs with the correct base URL", () => {
    expect(api.baseUrl).toBe("https://api.spacexdata.com");
  });

  // ─── Launch endpoints ────────────────────────────────────────────────────────

  it("getLaunches returns an array", async () => {
    const result = await api.getLaunches();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("getLaunch returns a launch by id", async () => {
    const result = await api.getLaunch("5eb87cd9ffd86e000604b32a");
    expect(result.id).toBe("5eb87cd9ffd86e000604b32a");
  });

  it("getPastLaunches returns an array", async () => {
    const result = await api.getPastLaunches();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getLatestLaunch returns a single launch", async () => {
    const result = await api.getLatestLaunch();
    expect(result).toBeDefined();
  });

  it("getUpcomingLaunchs returns an array", async () => {
    const result = await api.getUpcomingLaunchs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getNextLaunch returns a single launch", async () => {
    const result = await api.getNextLaunch();
    expect(result).toBeDefined();
  });

  it("queryNextLaunch sends POST and returns an array", async () => {
    const result = await api.queryNextLaunch({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── Rocket endpoints ────────────────────────────────────────────────────────

  it("getRockets returns an array", async () => {
    const result = await api.getRockets();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getRocket returns a rocket by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/rockets/falcon9`, () => HttpResponse.json({ id: "falcon9", name: "Falcon 9" }))
    );
    const result = await api.getRocket("falcon9");
    expect((result as any).id).toBe("falcon9");
  });

  it("queryRocket sends POST and returns a result", async () => {
    const result = await api.queryRocket({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── Capsule endpoints ───────────────────────────────────────────────────────

  it("getCapsules returns an array", async () => {
    const result = await api.getCapsules();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getCapsule returns a capsule by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/capsules/C201`, () => HttpResponse.json({ id: "C201", serial: "C201" }))
    );
    const result = await api.getCapsule("C201");
    expect((result as any).id).toBe("C201");
  });

  // ─── Core endpoints ──────────────────────────────────────────────────────────

  it("getCores returns an array", async () => {
    const result = await api.getCores();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getCore returns a core by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/cores/B1049`, () => HttpResponse.json({ id: "B1049" }))
    );
    const result = await api.getCore("B1049");
    expect((result as any).id).toBe("B1049");
  });

  // ─── Dragon endpoints ────────────────────────────────────────────────────────

  it("getDragons returns an array", async () => {
    const result = await api.getDragons();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getDragon returns a dragon by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/dragons/dragon2`, () => HttpResponse.json({ id: "dragon2" }))
    );
    const result = await api.getDragon("dragon2");
    expect((result as any).id).toBe("dragon2");
  });

  // ─── History endpoints ───────────────────────────────────────────────────────

  it("getHistoryEvents returns an array", async () => {
    const result = await api.getHistoryEvents();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getHistoryEvent returns an event by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/history/1`, () => HttpResponse.json({ id: "1", title: "First Launch" }))
    );
    const result = await api.getHistoryEvent("1");
    expect((result as any).id).toBe("1");
  });

  it("queryHistoryEvent sends POST and returns an array", async () => {
    const result = await api.queryHistoryEvent({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── Landpad / Launchpad endpoints ──────────────────────────────────────────

  it("getLandpads returns an array", async () => {
    const result = await api.getLandpads();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getLandpad returns a landpad by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/landpads/LZ-1`, () => HttpResponse.json({ id: "LZ-1" }))
    );
    const result = await api.getLandpad("LZ-1");
    expect((result as any).id).toBe("LZ-1");
  });

  it("getLaunchPads returns an array", async () => {
    const result = await api.getLaunchPads();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getLaunchPad returns a launchpad by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/launchpads/KSC_LC_39A`, () => HttpResponse.json({ id: "KSC_LC_39A" }))
    );
    const result = await api.getLaunchPad("KSC_LC_39A");
    expect((result as any).id).toBe("KSC_LC_39A");
  });

  // ─── Ship endpoints ──────────────────────────────────────────────────────────

  it("getShips returns an array", async () => {
    const result = await api.getShips();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getShip returns a ship by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/ships/S1`, () => HttpResponse.json({ ship_id: "S1" }))
    );
    const result = await api.getShip("S1");
    expect((result as any).ship_id).toBe("S1");
  });

  it("queryShips sends POST and returns a result", async () => {
    const result = await api.queryShips({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── Payload endpoints ───────────────────────────────────────────────────────

  it("getPayloads returns an array", async () => {
    const result = await api.getPayloads();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getPayload returns a payload by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/payloads/ZUMA`, () => HttpResponse.json({ id: "ZUMA" }))
    );
    const result = await api.getPayload("ZUMA");
    expect((result as any).id).toBe("ZUMA");
  });

  it("queryPayloads sends POST and returns an array", async () => {
    const result = await api.queryPayloads({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── Remaining endpoints ─────────────────────────────────────────────────────

  it("company returns an object", async () => {
    const result = await api.company();
    expect(result).toBeDefined();
  });

  it("getRoadster returns an object", async () => {
    const result = await api.getRoadster();
    expect(result).toBeDefined();
  });
});
