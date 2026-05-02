import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export interface CoverageFailure {
  timestamp: string;
  field: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  /** When set, this failure is an expected/documented limitation and will not block CI. */
  knownLimitation?: string;
}

export interface FailureMemory {
  slowQueries: CoverageFailure[];
  failingQueries: CoverageFailure[];
}

const MEMORY_PATH = resolve(process.cwd(), "src/qa/memory/qa-memory.json");

const emptyMemory = (): FailureMemory => ({
  slowQueries: [],
  failingQueries: [],
});

function memoryBucketFor(failure: CoverageFailure): keyof FailureMemory {
  if (failure.severity === "MEDIUM") return "slowQueries";
  return "failingQueries";
}

function sameFailure(left: CoverageFailure, right: CoverageFailure): boolean {
  return left.field === right.field && left.reason === right.reason && left.severity === right.severity;
}

export function readFailureMemory(): FailureMemory {
  if (!existsSync(MEMORY_PATH)) return emptyMemory();

  const parsed = JSON.parse(readFileSync(MEMORY_PATH, "utf-8")) as Partial<FailureMemory>;
  return {
    slowQueries: parsed.slowQueries ?? [],
    failingQueries: parsed.failingQueries ?? [],
  };
}

export function writeFailureMemory(memory: FailureMemory): void {
  writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2) + "\n");
}

/** Extracts the root resolver name from a query string like `{ launch(id: ...) { ... } }`. */
export function extractResolver(field: string): string {
  const match = field.match(/\{\s*(\w+)/);
  return match?.[1] ?? 'unknown';
}

/**
 * Groups failures by resolver name. Useful for surfacing root causes:
 * 5 failures all from `rockets` indicate a single broken resolver, not 5 independent bugs.
 */
export function clusterFailures(failures: CoverageFailure[]): Map<string, CoverageFailure[]> {
  const clusters = new Map<string, CoverageFailure[]>();
  for (const failure of failures) {
    const resolver = extractResolver(failure.field);
    const group = clusters.get(resolver) ?? [];
    clusters.set(resolver, [...group, failure]);
  }
  return clusters;
}

/**
 * Produces a human-readable CI summary that separates real failures from documented
 * known limitations, and groups real failures by resolver name to surface root causes.
 */
export function generateCIReport(failures: CoverageFailure[]): string {
  if (failures.length === 0) return '✅ No anomalies detected';

  const real = failures.filter(f => !f.knownLimitation);
  const known = failures.filter(f => f.knownLimitation);
  const clusters = clusterFailures(real);

  const lines: string[] = [];

  if (real.length > 0) {
    lines.push(`⚠️  QA Anomaly Report — ${real.length} failure(s) across ${clusters.size} resolver(s)`);
    for (const [resolver, group] of clusters) {
      const high = group.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length;
      const medium = group.filter(f => f.severity === 'MEDIUM').length;
      lines.push(`  ${resolver}: ${group.length} failure(s) — HIGH:${high} MEDIUM:${medium}`);
      for (const f of group) {
        lines.push(`    [${f.severity}] ${f.reason}`);
      }
    }
  } else {
    lines.push('✅ No real anomalies detected');
  }

  if (known.length > 0) {
    lines.push('');
    lines.push(`ℹ️  Known limitations (${known.length} — not blocking CI):`);
    for (const f of known) {
      lines.push(`  [${f.severity}] ${extractResolver(f.field)}: ${f.knownLimitation}`);
    }
  }

  return lines.join('\n');
}

/**
 * Records a coverage gap or failure discovered by the Autonomous QA Runner.
 */
export function recordFailure(failure: CoverageFailure): void {
  if (failure.knownLimitation) {
    console.warn(
      `[CoverageAgent] ⚠️  KNOWN LIMITATION: ${failure.field} — ${failure.knownLimitation}`
    );
  } else {
    console.error(
      `[CoverageAgent] ❌ GAP DETECTED: ${failure.field} - ${failure.reason} [${failure.severity}]`
    );
  }

  const memory = readFailureMemory();
  const bucket = memoryBucketFor(failure);
  const existingIndex = memory[bucket].findIndex((recorded) => sameFailure(recorded, failure));

  if (existingIndex >= 0) {
    memory[bucket][existingIndex] = failure;
  } else {
    memory[bucket].push(failure);
  }

  writeFailureMemory(memory);
}

export function forgetFailure(failure: CoverageFailure): void {
  const memory = readFailureMemory();
  writeFailureMemory({
    slowQueries: memory.slowQueries.filter((recorded) => !sameFailure(recorded, failure)),
    failingQueries: memory.failingQueries.filter((recorded) => !sameFailure(recorded, failure)),
  });
}
