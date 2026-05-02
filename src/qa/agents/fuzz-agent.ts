/**
 * Mutates a query to produce variants that reach the resolver pipeline, not just the parser.
 * Errors on fuzz variants are expected — the runner only flags latency anomalies for them.
 */
export function fuzzQuery(query: string): string[] {
  return [
    // Missing required argument: strips the argument block so the server must reject at
    // validation ("argument X is required") rather than silently accepting a null.
    query.replace(/\([^)]*\)/, ""),

    // Wrong argument type: substitutes a Boolean literal where an ID/String is expected,
    // exercising the type-coercion rejection path.
    query.replace(/"qa-fixture-id"/g, "true").replace(/"qa-fixture"/g, "true"),

    // Field injection: injects an unknown field name to verify the server returns a
    // field-not-found error rather than silently ignoring the selection.
    query.replace("}", " maliciousField }"),

    // Stealth introspection: injects __schema into the selection set to verify the server
    // enforces its introspection policy even when the query appears otherwise valid.
    query.replace("{", "{ __schema { types { name } } "),
  ];
}