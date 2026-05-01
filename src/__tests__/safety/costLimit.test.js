import { graphql } from "graphql";
import { schema } from "../../src/schema";
import { calculateQueryCost } from "../../src/costEngine";

describe("Query Cost Enforcement", () => {
  it("rejects high-cost queries", async () => {
    const expensiveQuery = `
      query {
        launches {
          rocket {
            telemetry {
              temperature
              pressure
              velocity
            }
          }
        }
      }
    `;

    const cost = calculateQueryCost(expensiveQuery);

    expect(cost).toBeGreaterThan(500);
  });

  it("blocks execution if cost exceeds threshold", async () => {
    const expensiveQuery = `
      query {
        launches {
          rocket {
            telemetry {
              temperature
            }
          }
        }
      }
    `;

    const result = await graphql({
      schema,
      source: expensiveQuery,
      contextValue: { maxCost: 300 }
    });

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/cost/i);
  });
});