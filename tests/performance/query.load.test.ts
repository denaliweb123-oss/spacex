import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import API from "../../src/api";

jest.mock("../../src/api");

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(() => server.stop());

function mockApi(): jest.Mocked<API> {
  const api = new API() as jest.Mocked<API>;
  api.getPastLaunches.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({ id: `launch-${i}`, name: `Mission ${i}` })) as any
  );
  return api;
}

describe("⚡ Performance & Resilience Agent", () => {
  it("resolves three concurrent queries in under 2000 ms (in-process, no network)", async () => {
    const query = `{ launchesPast(limit: 3) { mission_name } }`;

    const start = Date.now();
    await Promise.all(
      Array.from({ length: 3 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  it("handles 10 concurrent queries without errors", async () => {
    const query = `{ launchesPast(limit: 5) { id } }`;

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );

    for (const r of results) {
      expect((r.body as any).singleResult.errors).toBeUndefined();
      expect((r.body as any).singleResult.data.launchesPast).toHaveLength(5);
    }
  });

  it("each concurrent response contains the correct number of items", async () => {
    const query = `{ launchesPast(limit: 2) { id } }`;

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        server.executeOperation({ query }, { contextValue: { api: mockApi() } })
      )
    );

    for (const r of results) {
      expect((r.body as any).singleResult.data.launchesPast).toHaveLength(2);
    }
  });
});

// ─── Extended performance metrics ─────────────────────────────────────────────
// Covers four dimensions not addressed by the smoke tests above:
//   response time distribution (P50/P95/P99)
//   throughput (queries per second)
//   error rate under high concurrency
//   resource utilisation (heap growth, CPU user time)
//
// Thresholds are intentionally conservative so CI on slow runners passes while
// still catching catastrophic regressions (e.g. a blocking loop, a GC spiral).

describe("Performance metrics — response time, throughput, error rate, resources", () => {
  const QUERY = `{ launchesPast(limit: 5) { id mission_name } }`;

  function pct(sorted: number[], p: number): number {
    return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
  }

  // ── Response time distribution ──────────────────────────────────────────────
  it("response time: P50 < 100ms, P95 < 300ms, P99 < 500ms (30 sequential queries)", async () => {
    const durations: number[] = [];

    for (let i = 0; i < 30; i++) {
      const t = Date.now();
      await server.executeOperation({ query: QUERY }, { contextValue: { api: mockApi() } });
      durations.push(Date.now() - t);
    }

    durations.sort((a, b) => a - b);
    const [p50, p95, p99] = [pct(durations, 50), pct(durations, 95), pct(durations, 99)];
    console.log(`  Response time — P50: ${p50}ms  P95: ${p95}ms  P99: ${p99}ms`);

    expect(p50).toBeLessThan(100);
    expect(p95).toBeLessThan(300);
    expect(p99).toBeLessThan(500);
  });

  // ── Throughput ──────────────────────────────────────────────────────────────
  it("throughput: completes 50 sequential queries and sustains > 10 QPS", async () => {
    const n = 50;
    const start = Date.now();

    for (let i = 0; i < n; i++) {
      await server.executeOperation({ query: QUERY }, { contextValue: { api: mockApi() } });
    }

    const elapsed = (Date.now() - start) / 1000;
    const qps = n / elapsed;
    console.log(`  Throughput — ${qps.toFixed(1)} QPS over ${elapsed.toFixed(2)}s (${n} queries)`);

    // > 10 QPS is far below what an in-process mocked server can sustain (~200+);
    // the floor catches hangs, blocking awaits, and serialisation regressions.
    expect(qps).toBeGreaterThan(10);
  });

  // ── Error rate ──────────────────────────────────────────────────────────────
  it("error rate: 0 GraphQL errors across 50 concurrent queries (<1% threshold)", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        server.executeOperation({ query: QUERY }, { contextValue: { api: mockApi() } })
      )
    );

    const errored = results.filter(r => !!(r.body as any).singleResult?.errors);
    const errorRate = errored.length / results.length;
    console.log(`  Error rate — ${errored.length}/${results.length} (${(errorRate * 100).toFixed(1)}%)`);

    expect(errorRate).toBeLessThan(0.01);
  });

  // ── Resource utilisation: heap ──────────────────────────────────────────────
  it("memory: heap grows < 50MB during a 100-query concurrent burst", async () => {
    // Optional GC before sampling to reduce noise from prior test state.
    if (typeof (global as any).gc === "function") (global as any).gc();
    const heapBefore = process.memoryUsage().heapUsed;

    await Promise.all(
      Array.from({ length: 100 }, () =>
        server.executeOperation({ query: QUERY }, { contextValue: { api: mockApi() } })
      )
    );

    if (typeof (global as any).gc === "function") (global as any).gc();
    const heapAfter = process.memoryUsage().heapUsed;
    const growthMB = (heapAfter - heapBefore) / (1024 * 1024);
    console.log(`  Heap growth — ${growthMB.toFixed(2)} MB (before: ${(heapBefore / 1024 / 1024).toFixed(1)} MB  after: ${(heapAfter / 1024 / 1024).toFixed(1)} MB)`);

    expect(growthMB).toBeLessThan(50);
  });

  // ── Resource utilisation: CPU ───────────────────────────────────────────────
  it("CPU: average user-mode CPU time < 20ms per query (20 sequential queries)", async () => {
    const n = 20;
    const cpuBefore = process.cpuUsage();

    for (let i = 0; i < n; i++) {
      await server.executeOperation({ query: QUERY }, { contextValue: { api: mockApi() } });
    }

    const cpu = process.cpuUsage(cpuBefore);
    // cpuUsage returns microseconds; convert to ms and divide by query count.
    const avgUserMs = cpu.user / 1000 / n;
    const avgSysMs  = cpu.system / 1000 / n;
    console.log(`  CPU per query — user: ${avgUserMs.toFixed(2)}ms  system: ${avgSysMs.toFixed(2)}ms`);

    expect(avgUserMs).toBeLessThan(20);
  });
});
