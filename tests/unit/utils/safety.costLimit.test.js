import { parse, validate } from "graphql";
import { schema } from "../../../src/schema";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { calculateQueryCost } from "../../../src/costEngine";

describe("Query Cost Enforcement", () => {
  it("calculateQueryCost returns high cost for deeply nested queries", () => {
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

    // Depth-4 fields (launches.rocket.telemetry.*): 4^4 = 256 each × 3 fields = 768
    const cost = calculateQueryCost(expensiveQuery);

    expect(cost).toBeGreaterThan(500);
  });

  it("complexity validation rule blocks queries that exceed the configured limit", () => {
    // launches { id } has list-factor cost 10; threshold 5 ensures the rule fires
    const query = `query { launches { id } }`;
    const document = parse(query);
    const errors = validate(schema, document, [createComplexityLimitRule(5)]);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/complexity/i);
  });
});
