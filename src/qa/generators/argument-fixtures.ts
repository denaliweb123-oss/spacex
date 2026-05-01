import {
  GraphQLInputType,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
} from "graphql";

function quote(value: string): string {
  return JSON.stringify(value);
}

export function fixtureLiteralForType(type: GraphQLInputType): string {
  if (isNonNullType(type)) return fixtureLiteralForType(type.ofType);
  if (isListType(type)) return `[${fixtureLiteralForType(type.ofType)}]`;

  const namedType = getNamedType(type);

  if (isScalarType(namedType)) {
    switch (namedType.name) {
      case "Boolean":
        return "true";
      case "Float":
        return "1.5";
      case "Int":
        return "1";
      case "ID":
        return quote("qa-fixture-id");
      case "String":
        return quote("qa-fixture");
      default:
        return quote(`qa-${namedType.name.toLowerCase()}-fixture`);
    }
  }

  if (isEnumType(namedType)) {
    return namedType.getValues()[0]?.name ?? "UNKNOWN";
  }

  if (isInputObjectType(namedType)) {
    const fields = Object.values(namedType.getFields())
      .filter((field) => isNonNullType(field.type) && field.defaultValue === undefined)
      .map((field) => `${field.name}: ${fixtureLiteralForType(field.type)}`);

    return `{ ${fields.join(", ")} }`;
  }

  return quote("qa-fixture");
}
