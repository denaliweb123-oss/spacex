import API from "../api";

jest.mock("node-fetch");
const fetch = require("node-fetch");

describe("API", () => {
  let api: API;

  beforeEach(() => {
    api = new API();
    fetch.mockReset();
  });

  it("constructs with the correct base URL", () => {
    expect(api.baseUrl).toBe("https://api.spacexdata.com");
  });

  it("getLaunches calls the launches endpoint", async () => {
    const payload = [{ id: "launch1" }];
    fetch.mockResolvedValue({ json: async () => payload } as any);
    const result = await api.getLaunches();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/launches")
    );
    expect(result).toEqual(payload);
  });

  it("getLaunch calls the correct launch endpoint with id", async () => {
    const payload = { id: "abc123" };
    fetch.mockResolvedValue({ json: async () => payload } as any);
    const result = await api.getLaunch("abc123");
    // getLaunch uses version 5
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v5/launches/abc123")
    );
    expect(result).toEqual(payload);
  });

  it("getRocket calls the correct rocket endpoint with id", async () => {
    const payload = { id: "falcon9", name: "Falcon 9" };
    fetch.mockResolvedValue({ json: async () => payload } as any);
    const result = await api.getRocket("falcon9");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v4/rockets/falcon9")
    );
    expect(result).toEqual(payload);
  });
});
