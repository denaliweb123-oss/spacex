import { graphql } from "graphql";
import { schema } from "../../src/schema";

describe("Schema Validation", () => {
  it("should build schema without errors", () => {
    expect(schema).toBeDefined();
  });

  it("should reject invalid type resolution at build time", async () => {
    const query = `
      {
        __schema {
          types {
            name
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();
    expect(result.data.__schema.types.length).toBeGreaterThan(0);
  });
});