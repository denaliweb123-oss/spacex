import API from "../api";

jest.mock("node-fetch");
const fetch = require("node-fetch");

describe("API", () => {
  let api: API;

  beforeEach(() => {
    api = new API();
    fetch.mockReset();
    fetch.mockResolvedValue({ json: async () => ({}) } as any);
  });

  it("constructs with the correct base URL", () => {
    expect(api.baseUrl).toBe("https://api.spacexdata.com");
  });

  it("getLaunches calls /v4/launches", async () => {
    fetch.mockResolvedValue({ json: async () => [{ id: "1" }] } as any);
    const result = await api.getLaunches();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v4/launches"));
    expect(result).toEqual([{ id: "1" }]);
  });

  it("getLaunch calls /v5/launches/:id", async () => {
    fetch.mockResolvedValue({ json: async () => ({ id: "abc" }) } as any);
    const result = await api.getLaunch("abc");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v5/launches/abc"));
    expect(result).toEqual({ id: "abc" });
  });

  it("getRocket calls /v4/rockets/:id", async () => {
    fetch.mockResolvedValue({ json: async () => ({ id: "falcon9" }) } as any);
    await api.getRocket("falcon9");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v4/rockets/falcon9"));
  });

  it("getPastLaunches calls /v5/launches/past", async () => {
    fetch.mockResolvedValue({ json: async () => [] } as any);
    await api.getPastLaunches();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v5/launches/past"));
  });

  it("getShip calls /v4/ships/:id", async () => {
    fetch.mockResolvedValue({ json: async () => ({ ship_id: "S1" }) } as any);
    await api.getShip("S1");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v4/ships/S1"));
  });
});
