import { graphql } from "graphql";
import { schema } from "../../src/schema";

describe("Filter Operators", () => {
  it("supports 'in' filter correctly", async () => {
    const query = `
      query {
        launches(filter: { year: { in: ["2020", "2021"] } }) {
          id
          year
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();

    result.data.launches.forEach(l => {
      expect(["2020", "2021"]).toContain(l.year);
    });
  });
});