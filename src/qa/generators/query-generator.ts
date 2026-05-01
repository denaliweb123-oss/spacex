import { GraphQLSchema, isObjectType, getNamedType, isScalarType, isNonNullType } from "graphql";

/**
 * Generates a set of valid GraphQL queries based on the schema's root Query type.
 * Pass resolverFields to restrict generation to fields that have implementations.
 */
export function generateQueries(schema: GraphQLSchema, resolverFields?: Set<string>): string[] {
  const queryType = schema.getQueryType();
  if (!queryType) return [];

  const queries: string[] = [];
  const fields = queryType.getFields();

  for (const fieldName in fields) {
    if (resolverFields && !resolverFields.has(fieldName)) continue;
    const field = fields[fieldName];

    // Skip fields with required arguments — we can't provide valid values generically.
    if (field.args.some(arg => isNonNullType(arg.type) && arg.defaultValue === undefined)) continue;
    const namedType = getNamedType(field.type);

    if (isObjectType(namedType)) {
      const subFields = namedType.getFields();
      const firstScalar = Object.keys(subFields).find(fn => isScalarType(getNamedType(subFields[fn].type)));
      if (firstScalar) {
        queries.push(`{ ${fieldName} { ${firstScalar} } }`);
        continue;
      }
      // Object type with no scalar fields — any selection would be invalid syntax; skip it.
      continue;
    }
    queries.push(`{ ${fieldName} }`);
  }

  return queries;
}