import { graphql } from "graphql";
import { schema } from "../../src/schema";

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

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();
    expect(result.data.launch.rocket.telemetry).toBeDefined();
  });
});