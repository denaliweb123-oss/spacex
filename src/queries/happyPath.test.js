import { graphql } from "graphql";
import { schema } from "../../src/schema";
import RAW_LAUNCHES from "../__tests__/fixtures/launches.json";

const mockApi = {
  getLaunches: jest.fn().mockResolvedValue(RAW_LAUNCHES),
  getLaunch: jest.fn().mockResolvedValue(RAW_LAUNCHES[0]),
};

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

    const result = await graphql({ schema, source: query, contextValue: { api: mockApi } });

    expect(result.errors).toBeUndefined();
    expect(result.data.launches.length).toBe(2);
    expect(result.data.launches[0].rocket).toHaveProperty("name");
  });
});