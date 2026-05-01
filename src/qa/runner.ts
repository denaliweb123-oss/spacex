import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync, writeFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

import { generateQueries } from "./generators/query-generator";
import { fuzzQuery } from "./agents/fuzz-agent";
import { detectAnomaly } from "./agents/anomaly-agent";
import { recordFailure } from "./agents/coverage-agent";

export async function runAutonomousQA(): Promise<{
  totalQueriesExecuted: number;
  totalAnomaliesDetected: number;
  highSeverityAnomalies: number;
  mediumSeverityAnomalies: number;
}> {
  const schemaSDL = readFileSync("schema.graphql", "utf-8");
  const typeDefs = gql(schemaSDL);

  const schema = buildSubgraphSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
  });

  const resolverFields = new Set(Object.keys(resolvers.Query ?? {}));
  const queries = generateQueries(schema, resolverFields);

  let totalQueriesExecuted = 0;
  let totalAnomaliesDetected = 0;
  let highSeverityAnomalies = 0;
  let mediumSeverityAnomalies = 0;

  for (const query of queries) {
    const fuzzed = fuzzQuery(query);
    totalQueriesExecuted += 1 + fuzzed.length; // Original query + fuzzed variants
    for (const [index, q] of [query, ...fuzzed].entries()) {
      const isFuzz = index > 0;
      const start = Date.now();

      const res = await server.executeOperation(
        { query: q },
        { contextValue: { api: new API() } }
      );

      const duration = Date.now() - start;

      // Execution errors on fuzz variants are expected — only flag latency anomalies for them.
      const hasError = !isFuzz && res.body.kind === "single" && !!res.body.singleResult.errors;

      const anomaly = detectAnomaly({
        duration,
        hasError,
      });

      if (anomaly) {
        console.log(anomaly, q);

        const severity =
          anomaly.includes("LATENCY_THRESHOLD_EXCEEDED")
            ? "MEDIUM"
            : "HIGH";

        if (severity === "HIGH") highSeverityAnomalies++;
        else mediumSeverityAnomalies++;
        totalAnomaliesDetected++;

        recordFailure({
          timestamp: new Date().toISOString(),
          field: q,
          reason: anomaly,
          severity,
        });
      }
    }
  }

  await server.stop();

  const metrics = {
    totalQueriesExecuted,
    totalAnomaliesDetected,
    highSeverityAnomalies,
    mediumSeverityAnomalies,
    lastRun: new Date().toISOString(),
  };
  writeFileSync("qa-metrics.json", JSON.stringify(metrics, null, 2));
  return metrics;
}
