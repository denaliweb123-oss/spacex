import { graphql } from "graphql";
import { schema } from "../../src/schema";

describe("Happy Path Queries", () => {
  it("fetches launches with nested rocket data", async () => {
    const query = `
      query {
        launches(limit: 3) {
          id
          mission
          rocket {
            name
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();
    expect(result.data.launches.length).toBe(3);
    expect(result.data.launches[0].rocket).toHaveProperty("name");
  });
});