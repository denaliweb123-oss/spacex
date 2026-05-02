/**
 * In GraphQL Codegen, InputMaybe<T> allows T | null.
 * Internal services usually prefer T | undefined for optional arguments.
 */
type InputMaybe<T> = T | null | undefined;

/**
 * Standardizes pagination arguments by stripping null values.
 * This prevents 'null' from reaching internal services that expect numbers or undefined.
 */
export const sanitizePagination = <T extends { limit?: InputMaybe<number>; offset?: InputMaybe<number> }>(
  args: T
): { limit?: number; offset?: number } => {
  return {
    limit: args.limit ?? undefined,
    offset: args.offset ?? undefined,
  };
};