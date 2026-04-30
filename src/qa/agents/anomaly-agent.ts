/**
 * Detects if a GraphQL response execution represents an anomaly (slow or errored).
 */
export function detectAnomaly({ duration, hasError }: { duration: number; hasError: boolean }): string | null {
  const LATENCY_THRESHOLD_MS = 1500;

  if (duration > LATENCY_THRESHOLD_MS) return "⚠️ ANOMALY: LATENCY_THRESHOLD_EXCEEDED";
  if (hasError) return "❌ ANOMALY: EXECUTION_ERROR";

  return null;
}