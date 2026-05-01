import depthLimit from "graphql-depth-limit";
import { createComplexityLimitRule } from "graphql-validation-complexity";

export const validationRules = [
  depthLimit(7),
  createComplexityLimitRule(1000),
];
