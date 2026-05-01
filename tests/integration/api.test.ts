import API from "../../src/api";
import { server as mswServer } from "../mocks/msw.server";
import { http, HttpResponse } from "msw";

describe("API", () => {
  let api: API;

  beforeEach(() => {
    api = new API();
  });

  it("constructs with the correct base URL", () => {
    expect(api.baseUrl).toBe("https://api.spacexdata.com");
  });

  it("getLaunches calls /v4/launches", async () => {
    const result = await api.getLaunches();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("getLaunch calls /v5/launches/:id", async () => {
    const result = await api.getLaunch("5eb87cd9ffd86e000604b32a");
    expect(result.id).toBe("5eb87cd9ffd86e000604b32a");
    expect((result as any).name).toBe("FalconSat");
  });

  it("getRocket calls /v4/rockets/:id", async () => {
    mswServer.use(
      http.get('https://api.spacexdata.com/v4/rockets/falcon9', () => {
        return HttpResponse.json({ id: "falcon9" });
      })
    );
    await api.getRocket("falcon9");
  });

  it("getPastLaunches calls /v5/launches/past", async () => {
    mswServer.use(
      http.get('https://api.spacexdata.com/v5/launches/past', () => {
        return HttpResponse.json([]);
      })
    );
    await api.getPastLaunches();
  });

  it("getShip calls /v4/ships/:id", async () => {
    mswServer.use(
      http.get('https://api.spacexdata.com/v4/ships/S1', () => {
        return HttpResponse.json({ ship_id: "S1" });
      })
    );
    await api.getShip("S1");
  });
});
