import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync, writeFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

import { generateQueries } from "./generators/query-generator";
import type { CoverageFailure } from "./agents/coverage-agent";

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

function buildQaSchema() {
  const schemaSDL = readFileSync("schema.graphql", "utf-8");
  const typeDefs = gql(schemaSDL);
  return buildSubgraphSchema({ typeDefs, resolvers });
}

function buildQaServer(): ApolloServer {
  return new ApolloServer({
    schema: buildQaSchema(),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
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

  let detectAnomalyFn;
  try {
    const agent = await import("./agents/anomaly-agent");
    detectAnomalyFn = agent.detectAnomaly;
  } catch {
    detectAnomalyFn = () => null;
  }

  return detectAnomalyFn({ duration, hasError });
}

export async function runAutonomousQA(options: AutonomousQaOptions = {}): Promise<AutonomousQaMetrics> {
  const schema = buildQaSchema();
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });

  const resolverFields = new Set(Object.keys(resolvers.Query ?? {}));
  const { queries, skippedFields } = generateQueries(schema, resolverFields);

  // Load agents dynamically to ensure resilience if files are missing
  let fuzzQueryFn: (q: string) => string[];
  let detectAnomalyFn: (args: { duration: number; hasError: boolean }) => string | null;
  let recordFailureFn: (f: CoverageFailure) => void;

  try {
    const fuzzAgent = await import("./agents/fuzz-agent");
    fuzzQueryFn = fuzzAgent.fuzzQuery;
  } catch {
    fuzzQueryFn = (_q) => [];
  }

  try {
    const anomalyAgent = await import("./agents/anomaly-agent");
    detectAnomalyFn = anomalyAgent.detectAnomaly;
  } catch {
    detectAnomalyFn = () => null;
  }

  try {
    const coverageAgent = await import("./agents/coverage-agent");
    recordFailureFn = coverageAgent.recordFailure;
  } catch {
    recordFailureFn = (_f: CoverageFailure) => undefined;
  }

  let totalQueriesExecuted = 0;
  let totalAnomaliesDetected = 0;
  let highSeverityAnomalies = 0;
  let mediumSeverityAnomalies = 0;
  const anomalies: CoverageFailure[] = [];

  for (const query of queries) {
    const fuzzed = fuzzQueryFn(query);
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

      const anomaly = detectAnomalyFn({
        duration,
        hasError,
      });

      if (anomaly) {
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
        recordFailureFn(failure);
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
  if (options.writeMetrics ?? false) {
    writeFileSync("qa-metrics.json", JSON.stringify(metrics, null, 2));
  }

  return {
    ...metrics,
    anomalies,
    skippedResolverFields: skippedFields,
  };
}
