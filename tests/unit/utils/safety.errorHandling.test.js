import { graphql } from "graphql";
import { schema } from "../../../src/schema";

describe("Error Handling", () => {
  it("handles invalid ID gracefully — returns null, not a thrown error", async () => {
    const mockContext = {
      api: { getLaunch: jest.fn().mockResolvedValue(null) },
    };

    const query = `
      query {
        launch(id: "invalid-id") {
          id
          mission_name
        }
      }
    `;

    const result = await graphql({ schema, source: query, contextValue: mockContext });

    expect(result.errors).toBeUndefined();
    expect(result.data.launch).toBeNull();
  });

  it("captures upstream resolver errors in errors array without crashing the response", async () => {
    const mockContext = {
      api: {
        getLaunch: jest.fn().mockRejectedValue(new Error("upstream connection refused")),
      },
    };

    const query = `
      query {
        launch(id: "123") {
          id
          mission_name
        }
      }
    `;

    const result = await graphql({ schema, source: query, contextValue: mockContext });

    expect(result).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
