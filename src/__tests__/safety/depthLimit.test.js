import { graphql } from "graphql";
import { schema } from "../../src/schema";

describe("Depth Limiting", () => {
  it("rejects overly deep queries", async () => {
    const deepQuery = `
      query {
        launches {
          rocket {
            stages {
              engines {
                type {
                  name {
                    value {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await graphql({ schema, source: deepQuery });

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/depth/i);
  });
});