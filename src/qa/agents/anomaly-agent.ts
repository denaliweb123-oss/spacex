/**
 * Default latency threshold for in-process MSW-mocked execution.
 * 50ms is appropriate here — no real network, no port binding.
 * Override via QA_LATENCY_THRESHOLD env var.
 */
export const DEFAULT_LATENCY_THRESHOLD_MS = 50;

/**
 * Detects if a GraphQL response execution represents an anomaly (slow or errored).
 */
export function detectAnomaly({ duration, hasError }: { duration: number; hasError: boolean }): string | null {
  const LATENCY_THRESHOLD_MS = process.env.QA_LATENCY_THRESHOLD
    ? parseInt(process.env.QA_LATENCY_THRESHOLD)
    : DEFAULT_LATENCY_THRESHOLD_MS;

  if (duration > LATENCY_THRESHOLD_MS) return "⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED";
  if (hasError) return "❌ ANOMALY: EXECUTION_ERROR";

  return null;
}