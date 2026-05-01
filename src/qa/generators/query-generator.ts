import {
  GraphQLArgument,
  GraphQLFieldMap,
  GraphQLSchema,
  getNamedType,
  isObjectType,
  isScalarType,
  isNonNullType,
} from "graphql";
import { fixtureLiteralForType } from "./argument-fixtures";

function buildArgumentList(args: readonly GraphQLArgument[]): string {
  const requiredArgs = args.filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined);
  if (requiredArgs.length === 0) return "";

  const renderedArgs = requiredArgs.map((arg) => `${arg.name}: ${fixtureLiteralForType(arg.type)}`);
  return `(${renderedArgs.join(", ")})`;
}

function chooseScalarField(fieldNames: string[], fields: GraphQLFieldMap<unknown, unknown>): string | undefined {
  const scalarFields = fieldNames.filter((fieldName) => isScalarType(getNamedType(fields[fieldName].type)));
  return scalarFields.find((fieldName) => fieldName === "id") ?? scalarFields[0];
}

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

    const argumentList = buildArgumentList(field.args);
    const namedType = getNamedType(field.type);

    if (isObjectType(namedType)) {
      const subFields = namedType.getFields();
      const firstScalar = chooseScalarField(Object.keys(subFields), subFields);
      if (firstScalar) {
        queries.push(`{ ${fieldName}${argumentList} { ${firstScalar} } }`);
        continue;
      }
      // Object type with no scalar fields — any selection would be invalid syntax; skip it.
      continue;
    }
    queries.push(`{ ${fieldName}${argumentList} }`);
  }

  return queries;
}
