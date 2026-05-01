import { ContextFunction } from "@apollo/server";
import {
  StandaloneServerContextFunctionArgument,
  startStandaloneServer,
} from "@apollo/server/standalone";
import { createProductionApolloServer } from "./graphql/server";
import { DataSourceContext } from "./types/DataSourceContext";
import API from "./api";
import { SpaceXService } from "./services/SpaceXService";

const port = process.env.PORT ?? "4001";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const subgraphName: string = require("../package.json").name;

const context: ContextFunction<
  [StandaloneServerContextFunctionArgument],
  DataSourceContext
> = async () => {
  const api = new API();
  return { api, spacexService: new SpaceXService(api) };
};

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
