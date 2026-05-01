import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse, validate } from "graphql";
import gql from "graphql-tag";
import { readFileSync } from "fs";
import resolvers from "../../resolvers";
import { generateQueries } from "../../qa/generators/query-generator";

const typeDefs = gql(readFileSync("schema.graphql", "utf-8"));
const schema = buildSubgraphSchema({ typeDefs, resolvers });
const resolverFields = new Set(Object.keys(resolvers.Query ?? {}));

describe("Autonomous query generation", () => {
  const queries = generateQueries(schema, resolverFields);

  it("generates queries for required-argument root fields", () => {
    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\bcapsule\(id: "qa-fixture-id"\)/),
        expect.stringMatching(/\blaunch\(id: "qa-fixture-id"\)/),
        expect.stringMatching(/\brocket\(id: "qa-fixture-id"\)/),
        expect.stringMatching(/\bship\(id: "qa-fixture-id"\)/),
      ])
    );
  });

  it("generates only syntactically and schema-valid queries", () => {
    for (const query of queries) {
      expect(validate(schema, parse(query))).toEqual([]);
    }
  });
});
