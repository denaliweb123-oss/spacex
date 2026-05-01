import { GraphQLFormattedError } from "graphql";

export function formatError(
  formattedError: GraphQLFormattedError,
  _error: unknown
): GraphQLFormattedError {
  if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
    return { message: "Internal server error", extensions: { code: "INTERNAL_SERVER_ERROR" } };
  }
  return formattedError;
}
