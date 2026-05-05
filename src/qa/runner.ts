import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { GraphQLSchema } from "graphql";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import API from "../api";

import { generateQueries } from "./generators/query-generator";
import type { CoverageFailure } from "./agents/coverage-agent";
import { generateCIReport } from "./agents/coverage-agent";

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
  printReport?: boolean;
  /**
   * Pre-built executable schema to use instead of the default buildSubgraphSchema() call.
   * Pass an auto-mocked schema (e.g. addMocksToSchema from @graphql-tools/mock) to run the
   * QA cycle against realistic auto-generated data rather than the empty-array API mock.
   */
  schema?: GraphQLSchema;
}

function buildQaSchema() {
  const schemaSDL = readFileSync("schema.graphql", "utf-8");
  const typeDefs = gql(schemaSDL);
  return buildSubgraphSchema({ typeDefs, resolvers });
}

function buildQaServer(schema?: GraphQLSchema): ApolloServer {
  return new ApolloServer({
    schema: schema ?? buildQaSchema(),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });
}

export async function replayFailure(failure: CoverageFailure, opts: Pick<AutonomousQaOptions, "schema"> = {}): Promise<string | null> {
  const server = buildQaServer(opts.schema);
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
  const schema = options.schema ?? buildQaSchema();
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

  // Emit structured CI report when explicitly requested (not during normal test runs).
  if (options.printReport ?? false) {
    console.info('\n' + generateCIReport(anomalies) + '\n');
  }

  const metrics = {
    totalQueriesExecuted,
    totalAnomaliesDetected,
    highSeverityAnomalies,
    mediumSeverityAnomalies,
    lastRun: new Date().toISOString(),
  };
  if (options.writeMetrics ?? false) {
    const historyPath = "qa-metrics.json";
    let history: object[] = [];
    if (existsSync(historyPath)) {
      try {
        const raw = JSON.parse(readFileSync(historyPath, "utf-8"));
        // Handle legacy single-object format (pre-history migration) gracefully.
        history = Array.isArray(raw) ? raw : [raw];
      } catch {
        history = [];
      }
    }
    writeFileSync(historyPath, JSON.stringify([...history, metrics].slice(-10), null, 2));
  }

  return {
    ...metrics,
    anomalies,
    skippedResolverFields: skippedFields,
  };
}
