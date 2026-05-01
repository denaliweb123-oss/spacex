import { parseShip, parseLaunchpad, parseMissions, parsePayloadObj } from "../parse-service";

describe("parseShip", () => {
  it("maps ship_id → id, ship_name → name, ship_type → type", () => {
    const result = parseShip({ ship_id: "S1", ship_name: "Go Searcher", ship_type: "Tug", active: true });
    expect(result.id).toBe("S1");
    expect(result.name).toBe("Go Searcher");
    expect(result.type).toBe("Tug");
  });

  it("derives weight_lbs from weight_kg when lbs is absent", () => {
    const result = parseShip({ ship_id: "S1", weight_kg: 100 });
    expect(result.weight_lbs).toBe(220);
  });

  it("corrects an inconsistent weight_lbs using weight_kg", () => {
    const result = parseShip({ ship_id: "S1", weight_kg: 1000, weight_lbs: 1 });
    expect(result.weight_lbs).toBe(2205);
  });

  it("keeps provided weight_lbs when it agrees with weight_kg within 1%", () => {
    const result = parseShip({ ship_id: "S1", weight_kg: 1000, weight_lbs: 2205 });
    expect(result.weight_lbs).toBe(2205);
  });
});

describe("parseLaunchpad", () => {
  it("maps full_name → name and removes padid and full_name", () => {
    const result = parseLaunchpad({ padid: 1, full_name: "LC-39A", location: "KSC" });
    expect(result.name).toBe("LC-39A");
    expect(result.padid).toBeUndefined();
    expect(result.full_name).toBeUndefined();
  });
});

describe("parseMissions", () => {
  it("maps mission_id → id and mission_name → name", () => {
    const result = parseMissions({ mission_id: "F3364BF", mission_name: "Thaicom 6" });
    expect(result.id).toBe("F3364BF");
    expect(result.name).toBe("Thaicom 6");
  });
});

describe("parsePayloadObj", () => {
  it("prefers id over payload_id", () => {
    expect(parsePayloadObj({ id: "PL1", payload_id: "old" }).id).toBe("PL1");
  });

  it("falls back to payload_id when id is absent", () => {
    expect(parsePayloadObj({ payload_id: "PL2" }).id).toBe("PL2");
  });
});
