import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export interface CoverageFailure {
  timestamp: string;
  field: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
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

/**
 * Records a coverage gap or failure discovered by the Autonomous QA Runner.
 */
export function recordFailure(failure: CoverageFailure): void {
  console.error(
    `[CoverageAgent] ❌ GAP DETECTED: ${failure.field} - ${failure.reason} [${failure.severity}]`
  );

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
