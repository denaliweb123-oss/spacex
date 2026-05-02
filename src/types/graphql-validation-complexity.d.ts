declare module "graphql-validation-complexity" {
  import { ValidationRule } from "graphql";
  export function createComplexityLimitRule(
    maxComplexity: number,
    options?: Record<string, unknown>
  ): ValidationRule;
}
