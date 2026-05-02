import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse, validate } from "graphql";
import gql from "graphql-tag";
import { readFileSync } from "fs";
import resolvers from "../../src/resolvers";
import { generateQueries } from "../../src/qa/generators/query-generator";

const typeDefs = gql(readFileSync("schema.graphql", "utf-8"));
const schema = buildSubgraphSchema({ typeDefs, resolvers });
const resolverFields = new Set(Object.keys(resolvers.Query ?? {}));

describe("Autonomous query generation", () => {
  const { queries, skippedFields } = generateQueries(schema, resolverFields);

  it("generates queries for required-argument root fields", () => {
    expect(queries).toEqual(
      expect.arrayContaining([
        // capsule, rocket, ship have no fixture data → still use "qa-fixture-id"
        expect.stringMatching(/\bcapsule\(id: "qa-fixture-id"\)/),
        expect.stringMatching(/\brocket\(id: "qa-fixture-id"\)/),
        expect.stringMatching(/\bship\(id: "qa-fixture-id"\)/),
        // launch has a real fixture entry → uses the pinned seed ID, not "qa-fixture-id"
        expect.stringMatching(/\blaunch\(id: "5eb87cd9ffd86e000604b32a"\)/),
      ])
    );
  });

  it("generates only syntactically and schema-valid queries", () => {
    for (const query of queries) {
      expect(validate(schema, parse(query))).toEqual([]);
    }
  });

  it("selects multiple scalar fields per type, not just the first", () => {
    // launches returns Launch which has id, mission_name, launch_date_utc, etc.
    const launchesQuery = queries.find((q) => q.startsWith("{ launches"));
    expect(launchesQuery).toBeDefined();
    const selectionCount = ((launchesQuery ?? '').match(/\b\w+\b/g) ?? [])
      .filter((t) => !["launches", "limit", "offset", "find", "order", "sort"].includes(t)).length;
    expect(selectionCount).toBeGreaterThan(1);
  });

  it("covers every resolver field or records an explicit skip reason", () => {
    const generatedFieldNames = new Set(
      queries.map((q) => q.trim().replace(/^\{ /, "").split(/[\s(]/)[0])
    );
    const uncovered = [...resolverFields].filter(
      (f) => !generatedFieldNames.has(f) && !skippedFields.includes(f)
    );
    expect(uncovered).toEqual([]);
  });
});
