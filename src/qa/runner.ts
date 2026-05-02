import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync, writeFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

import { generateQueries } from "./generators/query-generator";
import { fuzzQuery } from "./agents/fuzz-agent";
import { detectAnomaly } from "./agents/anomaly-agent";
import { CoverageFailure, recordFailure } from "./agents/coverage-agent";

export interface AutonomousQaMetrics {
  totalQueriesExecuted: number;
  totalAnomaliesDetected: number;
  highSeverityAnomalies: number;
  mediumSeverityAnomalies: number;
  anomalies: CoverageFailure[];
  /** Root resolver fields skipped during query generation (no selectable scalar subfields). */
  skippedResolverFields: string[];
}

export interface AutonomousQaOptions {
  writeMetrics?: boolean;
}

function buildQaServer(): ApolloServer {
  const schemaSDL = readFileSync("schema.graphql", "utf-8");
  const typeDefs = gql(schemaSDL);

  const schema = buildSubgraphSchema({ typeDefs, resolvers });

  return new ApolloServer({
    schema,
  });
}

export async function replayFailure(failure: CoverageFailure): Promise<string | null> {
  const server = buildQaServer();
  const start = Date.now();
  const res = await server.executeOperation(
    { query: failure.field },
    { contextValue: { api: new API() } }
  );
  const duration = Date.now() - start;
  await server.stop();

  const hasError = res.body.kind === "single" && !!res.body.singleResult.errors;
  return detectAnomaly({ duration, hasError });
}

export async function runAutonomousQA(options: AutonomousQaOptions = {}): Promise<AutonomousQaMetrics> {
  const schemaSDL = readFileSync("schema.graphql", "utf-8");
  const typeDefs = gql(schemaSDL);
  const schema = buildSubgraphSchema({ typeDefs, resolvers });
  const server = buildQaServer();

  const resolverFields = new Set(Object.keys(resolvers.Query ?? {}));
  const { queries, skippedFields } = generateQueries(schema, resolverFields);

  let totalQueriesExecuted = 0;
  let totalAnomaliesDetected = 0;
  let highSeverityAnomalies = 0;
  let mediumSeverityAnomalies = 0;
  const anomalies: CoverageFailure[] = [];

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

        const failure: CoverageFailure = {
          timestamp: new Date().toISOString(),
          field: q,
          reason: anomaly,
          severity,
        };

        anomalies.push(failure);
        recordFailure(failure);
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
  if (options.writeMetrics ?? true) {
    writeFileSync("qa-metrics.json", JSON.stringify(metrics, null, 2));
  }

  return {
    ...metrics,
    anomalies,
    skippedResolverFields: skippedFields,
  };
}
