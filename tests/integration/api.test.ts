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

  it.each([
    ["getLaunches",        undefined],
    ["getPastLaunches",    undefined],
    ["getUpcomingLaunchs", undefined],
    ["getRockets",         undefined],
    ["getCapsules",        undefined],
    ["getCores",           undefined],
    ["getDragons",         undefined],
    ["getHistoryEvents",   undefined],
    ["getLandpads",        undefined],
    ["getLaunchPads",      undefined],
    ["getShips",           undefined],
    ["getPayloads",        undefined],
    ["queryNextLaunch",    { limit: 1 }],
    ["queryRocket",        { limit: 1 }],
    ["queryHistoryEvent",  { limit: 1 }],
    ["queryShips",         { limit: 1 }],
    ["queryPayloads",      { limit: 1 }],
  ] as [string, object | undefined][])(
    "%s — returns an array",
    async (method, arg) => {
      const result = await (api as any)[method](...(arg !== undefined ? [arg] : []));
      expect(Array.isArray(result)).toBe(true);
    }
  );

  it("getLaunch returns a launch by id", async () => {
    const result = await api.getLaunch("5eb87cd9ffd86e000604b32a");
    expect(result.id).toBe("5eb87cd9ffd86e000604b32a");
  });

  it("getLatestLaunch returns a single launch", async () => {
    const result = await api.getLatestLaunch();
    expect(result).toBeDefined();
  });

  it("getNextLaunch returns a single launch", async () => {
    const result = await api.getNextLaunch();
    expect(result).toBeDefined();
  });

  // ─── Rocket endpoints ────────────────────────────────────────────────────────

  it("getRocket returns a rocket by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/rockets/falcon9`, () => HttpResponse.json({ id: "falcon9", name: "Falcon 9" }))
    );
    const result = await api.getRocket("falcon9");
    expect((result as any).id).toBe("falcon9");
  });

  // ─── Capsule endpoints ───────────────────────────────────────────────────────

  it("getCapsule returns a capsule by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/capsules/C201`, () => HttpResponse.json({ id: "C201", serial: "C201" }))
    );
    const result = await api.getCapsule("C201");
    expect((result as any).id).toBe("C201");
  });

  // ─── Core endpoints ──────────────────────────────────────────────────────────

  it("getCore returns a core by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/cores/B1049`, () => HttpResponse.json({ id: "B1049" }))
    );
    const result = await api.getCore("B1049");
    expect((result as any).id).toBe("B1049");
  });

  // ─── Dragon endpoints ────────────────────────────────────────────────────────

  it("getDragon returns a dragon by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/dragons/dragon2`, () => HttpResponse.json({ id: "dragon2" }))
    );
    const result = await api.getDragon("dragon2");
    expect((result as any).id).toBe("dragon2");
  });

  // ─── History endpoints ───────────────────────────────────────────────────────

  it("getHistoryEvent returns an event by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/history/1`, () => HttpResponse.json({ id: "1", title: "First Launch" }))
    );
    const result = await api.getHistoryEvent("1");
    expect((result as any).id).toBe("1");
  });

  // ─── Landpad / Launchpad endpoints ──────────────────────────────────────────

  it("getLandpad returns a landpad by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/landpads/LZ-1`, () => HttpResponse.json({ id: "LZ-1" }))
    );
    const result = await api.getLandpad("LZ-1");
    expect((result as any).id).toBe("LZ-1");
  });

  it("getLaunchPad returns a launchpad by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/launchpads/KSC_LC_39A`, () => HttpResponse.json({ id: "KSC_LC_39A" }))
    );
    const result = await api.getLaunchPad("KSC_LC_39A");
    expect((result as any).id).toBe("KSC_LC_39A");
  });

  // ─── Ship endpoints ──────────────────────────────────────────────────────────

  it("getShip returns a ship by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/ships/S1`, () => HttpResponse.json({ ship_id: "S1" }))
    );
    const result = await api.getShip("S1");
    expect((result as any).ship_id).toBe("S1");
  });

  // ─── Payload endpoints ───────────────────────────────────────────────────────

  it("getPayload returns a payload by id", async () => {
    mswServer.use(
      http.get(`${BASE}/v4/payloads/ZUMA`, () => HttpResponse.json({ id: "ZUMA" }))
    );
    const result = await api.getPayload("ZUMA");
    expect((result as any).id).toBe("ZUMA");
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
