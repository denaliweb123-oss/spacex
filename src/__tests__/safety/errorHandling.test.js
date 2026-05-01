import { graphql } from "graphql";
import { schema } from "../../src/schema";

describe("Error Handling", () => {
  it("handles invalid ID gracefully", async () => {
    const query = `
      query {
        launch(id: "invalid-id") {
          id
          mission
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeDefined();
    expect(result.data.launch).toBeNull();
  });

  it("does not break entire response on partial failure", async () => {
    const query = `
      query {
        launch(id: "123") {
          id
          rocket {
            invalidField
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.data.launch).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});