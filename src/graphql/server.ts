import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";
import { ApolloServerPlugin } from "@apollo/server";
import responseCachePlugin from "@apollo/server-plugin-response-cache";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import { GraphQLSchema, ValidationRule } from "graphql";
import gql from "graphql-tag";
import resolvers from "../resolvers";
import { DataSourceContext } from "../types/DataSourceContext";
import { formatError } from "./security/errorFormatter";
import { validationRules as productionValidationRules } from "./security/validationRules";

export interface ProductionServerOptions {
  introspection?: boolean;
  plugins?: ApolloServerPlugin<DataSourceContext>[];
  validationRules?: ValidationRule[];
}

export function buildProductionSchema(): GraphQLSchema {
  const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
  return buildSubgraphSchema({ typeDefs, resolvers });
}

function productionPlugins(): ApolloServerPlugin<DataSourceContext>[] {
  return [
    ApolloServerPluginCacheControl({ defaultMaxAge: 86400 }),
    responseCachePlugin({
      shouldWriteToCache: async (requestContext) =>
        (requestContext.overallCachePolicy.maxAge ?? 0) > 0 &&
        requestContext.operationName !== "IntrospectionQuery" &&
        !requestContext.operationName?.toLowerCase().includes("introspection"),
    }),
    {
      async serverWillStart() {
        return {
          async renderLandingPage() {
            const html = `
              <!DOCTYPE html>
              <meta http-equiv="Refresh" content="0; url='https://studio.apollographql.com/public/SpaceX-pxxbxen/explorer?variant=current'" />`;
            return { html };
          },
        };
      },
    },
  ];
}

export function createProductionApolloServer(
  options: ProductionServerOptions = {}
): ApolloServer<DataSourceContext> {
  return new ApolloServer<DataSourceContext>({
    schema: buildProductionSchema(),
    validationRules: options.validationRules ?? productionValidationRules,
    formatError,
    introspection: options.introspection ?? process.env.NODE_ENV !== "production",
    plugins: options.plugins ?? productionPlugins(),
  });
}
