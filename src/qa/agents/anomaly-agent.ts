/**
 * Detects if a GraphQL response execution represents an anomaly (slow or errored).
 */
export function detectAnomaly({ duration, hasError }: { duration: number; hasError: boolean }): string | null {
  // 50ms is appropriate for in-process MSW-mocked execution (no network). 1500ms would
  // never fire in this environment and renders the detector effectively disabled.
  const LATENCY_THRESHOLD_MS = process.env.QA_LATENCY_THRESHOLD ? parseInt(process.env.QA_LATENCY_THRESHOLD) : 50;

  if (duration > LATENCY_THRESHOLD_MS) return "⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED";
  if (hasError) return "❌ ANOMALY: EXECUTION_ERROR";

  return null;
}