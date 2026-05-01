import { ContextFunction } from "@apollo/server";
import {
  StandaloneServerContextFunctionArgument,
  startStandaloneServer,
} from "@apollo/server/standalone";
import { createProductionApolloServer } from "./graphql/server";
import pkg from "../package.json";
import { DataSourceContext } from "./types/DataSourceContext";

const port = process.env.PORT ?? "4001";
const subgraphName = pkg.name;
import API from "./api";

const context: ContextFunction<
  [StandaloneServerContextFunctionArgument],
  DataSourceContext
> = async ({ req }) => ({
  api: new API(),
});

async function main() {
  const server = createProductionApolloServer();
  const { url } = await startStandaloneServer(server, {
    context,
    listen: { port: Number.parseInt(port) },
  });

  console.log(`🚀  Subgraph ${subgraphName} ready at ${url}`);
  console.log(`Run 'rover dev --url ${url} --name ${subgraphName}`);
}

main();
