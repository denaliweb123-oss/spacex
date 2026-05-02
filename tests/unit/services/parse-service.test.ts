import { parseShip, parseLaunchpad, parseMissions, parsePayloadObj, parsePayloads, parsePayload } from "../../../src/parse-service";

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

// Helper: build a launch object with payloads nested at rocket.second_stage.payloads
function makeLaunch(...payloads: object[]) {
  return { rocket: { second_stage: { payloads } } };
}

describe("parsePayloads", () => {
  it("returns all payloads when query is empty", () => {
    const launches = [makeLaunch({ id: "p1" }, { id: "p2" })];
    expect(parsePayloads(launches, {})).toHaveLength(2);
  });

  it("returns an empty array when data has no launches", () => {
    expect(parsePayloads([], {})).toHaveLength(0);
  });

  it("skips launches with no rocket.second_stage.payloads", () => {
    const launches = [{ rocket: null }, { rocket: { second_stage: null } }];
    expect(parsePayloads(launches, {})).toHaveLength(0);
  });

  it("filters payloads to those matching all query fields", () => {
    const launches = [
      makeLaunch(
        { id: "p1", nationality: "USA", orbit: "LEO" },
        { id: "p2", nationality: "USA", orbit: "GTO" },
        { id: "p3", nationality: "ESA", orbit: "LEO" },
      ),
    ];
    const result = parsePayloads(launches, { nationality: "USA", orbit: "LEO" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("excludes payloads that partially match the query", () => {
    const launches = [makeLaunch({ id: "p1", nationality: "USA", orbit: "GTO" })];
    const result = parsePayloads(launches, { nationality: "USA", orbit: "LEO" });
    expect(result).toHaveLength(0);
  });

  it("accumulates payloads across multiple launches", () => {
    const launches = [
      makeLaunch({ id: "p1" }),
      makeLaunch({ id: "p2" }),
    ];
    expect(parsePayloads(launches, {})).toHaveLength(2);
  });
});

describe("parsePayload", () => {
  it("returns null when launch is null", () => {
    expect(parsePayload(null, "p1")).toBeNull();
  });

  it("returns the payload matching payload_id at index 0", () => {
    const launch = makeLaunch({ id: "p1", type: "Satellite" }, { id: "p2" });
    expect(parsePayload(launch, "p1").id).toBe("p1");
  });

  it("returns the correct payload when the match is not at index 0", () => {
    const launch = makeLaunch({ id: "p1" }, { id: "p2", type: "Dragon" }, { id: "p3" });
    const result = parsePayload(launch, "p2");
    expect(result.id).toBe("p2");
    expect(result.type).toBe("Dragon");
  });

  it("falls back to payload_id field when id is absent", () => {
    const launch = makeLaunch({ payload_id: "legacy-1", type: "Crew" });
    expect(parsePayload(launch, "legacy-1").id).toBe("legacy-1");
  });
});
