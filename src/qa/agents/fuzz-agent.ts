/**
 * Mutates a query to simulate common injection or syntax attacks.
 */
export function fuzzQuery(query: string): string[] {
  return [
    query.replace("{", "{{"),           // Double brace injection
    query.replace("}", " malicious }"), // Field injection
    query + "\n# unexpected comment",   // Trailing data
    query.replace("{", "{ __schema { types { name } } "), // Stealth introspection attempt
  ];
}