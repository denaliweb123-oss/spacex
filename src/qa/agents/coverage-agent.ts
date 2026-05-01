// src/qa/agents/coverage-agent.ts
export interface CoverageFailure {
  timestamp: string;
  field: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

/**
 * Records a coverage gap or failure discovered by the Autonomous QA Runner.
 */
export function recordFailure(failure: CoverageFailure): void {
  console.error(
    `[CoverageAgent] ❌ GAP DETECTED: ${failure.field} - ${failure.reason} [${failure.severity}]`
  );

  // Intentionally no persistence in this lightweight module.
  // In CI/CD, a future orchestrator can replace this with artifact persistence.
}
