import { graphql } from "graphql";
import { schema } from "../../src/schema";
import RAW_LAUNCHES from "../__tests__/fixtures/launches.json";

const mockApi = {
  getLaunch: jest.fn().mockResolvedValue(RAW_LAUNCHES[0]),
  getRocket: jest.fn().mockResolvedValue({ id: "rocket1", name: "Falcon 1", telemetry: { temperature: 25 } }),
};

describe("Nested Query Integrity", () => {
  it("resolves launch → rocket → telemetry chain", async () => {
    const query = `
      query {
        launch(id: "123") {
          rocket {
            telemetry {
              temperature
            }
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query, contextValue: { api: mockApi } });

    expect(result.errors).toBeUndefined();
    expect(result.data.launch.rocket.telemetry).toBeDefined();
  });
});