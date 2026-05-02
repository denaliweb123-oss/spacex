import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import { DocumentNode, parse, ValidationRule } from 'graphql';

export const MAX_DEPTH = 7;
export const MAX_COST = 1000;

// Depth-exponential cost model: each field costs DEPTH_COST_BASE ^ depth.
// This reflects how list-returning fields compound: a list at depth 1 with
// N items means every child field runs N times, making deeper fields
// disproportionately expensive without schema-aware list sizes.
const DEPTH_COST_BASE = 4;

/**
 * Returns the maximum selection-set depth of a parsed document.
 * Introspection fields (__schema, __type, __typename) are excluded so that
 * tooling queries are not unfairly penalised.
 */
export function calculateQueryDepth(document: DocumentNode): number {
  let maxDepth = 0;

  function walk(
    selections: ReadonlyArray<{
      kind: string;
      name?: { value: string };
      selectionSet?: { selections: ReadonlyArray<any> };
    }>,
    depth: number,
  ): void {
    for (const node of selections) {
      if (node.kind === 'Field') {
        if (node.name?.value?.startsWith('__')) continue;
        const current = depth + 1;
        if (current > maxDepth) maxDepth = current;
        if (node.selectionSet) walk(node.selectionSet.selections, current);
      } else if (node.kind === 'InlineFragment' || node.kind === 'FragmentSpread') {
        if (node.selectionSet) walk(node.selectionSet.selections, depth);
      }
    }
  }

  for (const def of document.definitions) {
    if (def.kind === 'OperationDefinition' && (def as any).selectionSet) {
      walk((def as any).selectionSet.selections, 0);
    }
  }

  return maxDepth;
}

/**
 * Estimates the execution cost of a query string using a depth-exponential
 * model. Each field contributes DEPTH_COST_BASE ^ depth to the total, which
 * approximates the compounding expense of deeply-nested list traversals
 * without requiring schema type information.
 *
 * Rule of thumb: a query that would stress the server should score > MAX_COST.
 */
export function calculateQueryCost(query: string): number {
  const document = parse(query);
  let total = 0;

  function walk(
    selections: ReadonlyArray<{
      kind: string;
      name?: { value: string };
      selectionSet?: { selections: ReadonlyArray<any> };
    }>,
    depth: number,
  ): void {
    for (const node of selections) {
      if (node.kind === 'Field') {
        if (node.name?.value?.startsWith('__')) continue;
        total += Math.pow(DEPTH_COST_BASE, depth + 1);
        if (node.selectionSet) walk(node.selectionSet.selections, depth + 1);
      } else if (node.kind === 'InlineFragment') {
        if (node.selectionSet) walk(node.selectionSet.selections, depth);
      }
    }
  }

  for (const def of document.definitions) {
    if (def.kind === 'OperationDefinition' && (def as any).selectionSet) {
      walk((def as any).selectionSet.selections, 0);
    }
  }

  return total;
}

/**
 * Apollo Server ValidationRule: rejects queries whose selection depth exceeds
 * MAX_DEPTH. Applied during the validation phase, before execution.
 */
export const depthLimitRule: ValidationRule = depthLimit(MAX_DEPTH);

/**
 * Apollo Server ValidationRule: rejects queries whose schema-aware complexity
 * score exceeds MAX_COST. Applied during the validation phase, before execution.
 */
export const costLimitRule: ValidationRule = createComplexityLimitRule(MAX_COST);

/**
 * Ready-to-use array for Apollo Server's `validationRules` option.
 * Enforces both depth and cost limits in a single import.
 */
export const complexityValidationRules: ValidationRule[] = [
  depthLimitRule,
  costLimitRule,
];
