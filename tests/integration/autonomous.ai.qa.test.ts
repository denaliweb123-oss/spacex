import { readFileSync } from "fs";
import { addMocksToSchema } from "@graphql-tools/mock";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { mockCustomScalars } from "@apollo/graphql-testing-library";
import gql from "graphql-tag";

import { replayFailure, runAutonomousQA } from "../../src/qa/runner";
import { forgetFailure, readFailureMemory } from "../../src/qa/agents/coverage-agent";

// Build the production federation schema (handles @link / federation directives).
// Then apply addMocksToSchema so every field returns an auto-generated value instead
// of delegating to context.api. This is the in-process equivalent of passing
// buildSubgraphSchema(...) to createHandlerFromSchema from @apollo/graphql-testing-library —
// both internally use @graphql-tools/mock to populate all types with default values.
//
// mockCustomScalars supplies placeholder resolvers for the four custom scalars
// (Date, ObjectID, timestamptz, uuid); without them @graphql-tools/mock throws
// "No mock defined for type X" and every query containing those fields errors.
//
// The result: the QA cycle runs against realistic auto-generated data (non-null
// strings, IDs, booleans) rather than the empty-array / null stubs from the
// previous jest.mock of the API — a substantially stronger anomaly gate.
const typeDefs = gql(readFileSync("schema.graphql", "utf-8"));
const federationSchema = buildSubgraphSchema({ typeDefs, resolvers: {} });
const autoMockedSchema = addMocksToSchema({
  schema: federationSchema,
  mocks: mockCustomScalars(federationSchema),
});

describe("🤖 Autonomous GraphQL QA System", () => {
  let metrics: Awaited<ReturnType<typeof runAutonomousQA>>;

  beforeAll(async () => {
    metrics = await runAutonomousQA({
      writeMetrics: process.env.CI === "true",
      schema: autoMockedSchema,
    });
  }, 30000);

  it("runAutonomousQA — auto-mocked schema — reports zero HIGH severity anomalies", () => {
    expect(metrics.highSeverityAnomalies).toBe(0);
    expect(metrics.anomalies.filter((anomaly) => anomaly.severity === "HIGH")).toEqual([]);
  });

  it("generates a query for every resolver field with no uncovered gaps", () => {
    // skippedResolverFields are recorded when a type has no selectable scalar subfields.
    // If this list grows, add fixture scalar fields or document the skip explicitly.
    expect(metrics.skippedResolverFields).toEqual([]);
  });
});

describe("Autonomous failure memory replay", () => {
  const persistedFailures = readFailureMemory().failingQueries;

  if (persistedFailures.length === 0) {
    it("has no persisted high severity failures to replay", () => {
      expect(persistedFailures).toEqual([]);
    });
  } else {
    it.each(persistedFailures)(
      "replays and clears recovered failure %#",
      async (failure) => {
        const anomaly = await replayFailure(failure, { schema: autoMockedSchema });

        expect(anomaly).toBeNull();
        forgetFailure(failure);
      },
      30000
    );
  }
});
