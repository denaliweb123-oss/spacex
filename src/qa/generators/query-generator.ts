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

// Builds a nested selection for types that have no direct scalar fields (e.g. pagination
// wrappers like HistoriesResult { result { totalCount } }). Returns undefined if no
// nested scalar can be found within one additional level.
function buildNestedSelection(fields: GraphQLFieldMap<unknown, unknown>): string | undefined {
  for (const subFieldName of Object.keys(fields)) {
    const subField = fields[subFieldName];
    if (subField.deprecationReason) continue;
    const subNamed = getNamedType(subField.type);
    if (!isObjectType(subNamed)) continue;
    const grandChildren = subNamed.getFields();
    const scalars = Object.keys(grandChildren).filter(
      (f) => isScalarType(getNamedType(grandChildren[f].type)) && !grandChildren[f].deprecationReason
    );
    if (scalars.length > 0) {
      return `${subFieldName} { ${scalars.slice(0, 3).join(" ")} }`;
    }
  }
  return undefined;
}

export interface QueryGenerationResult {
  queries: string[];
  /** Root fields that were skipped because no valid selection set could be derived. */
  skippedFields: string[];
}

function buildArgumentList(args: readonly GraphQLArgument[]): string {
  const requiredArgs = args.filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined);
  if (requiredArgs.length === 0) return "";
  const renderedArgs = requiredArgs.map((arg) => `${arg.name}: ${fixtureLiteralForType(arg.type)}`);
  return `(${renderedArgs.join(", ")})`;
}

// Returns up to 5 non-deprecated scalar fields, id-first when present.
function chooseScalarFields(fieldNames: string[], fields: GraphQLFieldMap<unknown, unknown>): string[] {
  const scalars = fieldNames.filter(
    (f) => isScalarType(getNamedType(fields[f].type)) && !fields[f].deprecationReason
  );
  const sorted = scalars.includes("id") ? ["id", ...scalars.filter((f) => f !== "id")] : scalars;
  return sorted.slice(0, 5);
}

/**
 * Generates a set of valid GraphQL queries based on the schema's root Query type.
 * Each object-type result selects up to 5 non-deprecated scalar fields (id-first).
 * Pass resolverFields to restrict generation to fields that have implementations.
 */
export function generateQueries(schema: GraphQLSchema, resolverFields?: Set<string>): QueryGenerationResult {
  const queryType = schema.getQueryType();
  if (!queryType) return { queries: [], skippedFields: [] };

  const queries: string[] = [];
  const skippedFields: string[] = [];
  const fields = queryType.getFields();

  for (const fieldName in fields) {
    if (resolverFields && !resolverFields.has(fieldName)) continue;
    const field = fields[fieldName];

    const argumentList = buildArgumentList(field.args);
    const namedType = getNamedType(field.type);

    if (isObjectType(namedType)) {
      const subFields = namedType.getFields();
      const scalars = chooseScalarFields(Object.keys(subFields), subFields);
      if (scalars.length > 0) {
        queries.push(`{ ${fieldName}${argumentList} { ${scalars.join(" ")} } }`);
        continue;
      }
      // No direct scalar fields — try one level deeper (handles pagination wrappers like
      // HistoriesResult { result { totalCount } }).
      const nested = buildNestedSelection(subFields);
      if (nested) {
        queries.push(`{ ${fieldName}${argumentList} { ${nested} } }`);
        continue;
      }
      // Still no path to a scalar — record the skip for the coverage assertion.
      skippedFields.push(fieldName);
      continue;
    }
    queries.push(`{ ${fieldName}${argumentList} }`);
  }

  return { queries, skippedFields };
}
