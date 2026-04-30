import { parseShip } from "../../parse-service";
import { applyLimitOffset } from "../../limit-offset-service";

describe("🧪 Service Logic Agent", () => {
  it("validates transformation correctness", () => {
    const input = {
      ship_id: "GOMSCHIEF",
      ship_name: "GO MS CHIEF",
      ship_type: "High Speed Craft",
      active: true,
    };

    const result = parseShip(input);

    expect(result.id).toBe("GOMSCHIEF");
    expect(result.name).toBe("GO MS CHIEF");
    expect(result.type).toBe("High Speed Craft");
  });

  it("ensures pagination is deterministic", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ id: i }));

    const page1 = applyLimitOffset({ data, limit: 5, offset: 0 });
    const page2 = applyLimitOffset({ data, limit: 5, offset: 5 });

    expect(page1[0].id).toBe(0);
    expect(page2[0].id).toBe(5);
  });
});