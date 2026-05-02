import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import responseCachePlugin from "@apollo/server-plugin-response-cache";
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../resolvers";

export function createProductionApolloServer(options: any = {}) {
  const typeDefs = gql(
    readFileSync("schema.graphql", {
      encoding: "utf-8",
    })
  );

  return new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    introspection: options.introspection !== undefined ? options.introspection : true,
    plugins: [
      ApolloServerPluginCacheControl({ defaultMaxAge: 86400 }),
      responseCachePlugin({
        shouldWriteToCache: async (requestContext) => {
          if (
            requestContext.operationName !== "IntrospectionQuery" &&
            !requestContext?.operationName?.toLowerCase()?.includes("introspection")
          ) {
            console.log(
              `Hash: ${requestContext.queryHash}\n\tAge: ${
                requestContext.overallCachePolicy.maxAge
              }\n\tOperation: ${
                requestContext.source?.replaceAll("\n", "").replaceAll("\t", "") ?? ""
              }\n\tVariables: ${JSON.stringify(requestContext.request.variables)}`
            );
          }
          return false;
        },
      }),
      ...(options.plugins || []),
    ],
    formatError: (formattedError) => {
      if (process.env.NODE_ENV === "production") {
        return {
          message: "Internal server error",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        };
      }
      return formattedError;
    },
  });
}