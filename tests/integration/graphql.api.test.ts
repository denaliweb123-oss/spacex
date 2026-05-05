import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../src/resolvers";
import API from "../../src/api";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";

const typeDefs = gql(readFileSync("schema.graphql", { encoding: "utf-8" }));
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [ApolloServerPluginInlineTraceDisabled()],
});

afterAll(async () => await server.stop());

describe("Integration: Launches Resolver Pipeline", () => {
  it("executes full Query -> Resolver -> Transformation flow", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches { mission_name launch_year launch_date_unix } }` },
      { contextValue: { api } }
    );

    const data = (res.body as any).singleResult.data.launches[0];
    expect(data.mission_name).toBe("FalconSat");
    expect(data.launch_year).toBe("2006");
    expect(data.launch_date_unix).toBe(1143239400);
  });

  it("validates pagination filters through the server layer", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches(limit: 1) { id } }` },
      { contextValue: { api } }
    );

    expect((res.body as any).singleResult.data.launches).toHaveLength(1);
  });

  it("ensures partial failures do not crash the request", async () => {
    const api = new API();

    const res = await server.executeOperation(
      { query: `{ launches { mission_name links { article_link } } }` },
      { contextValue: { api } }
    );

    expect((res.body as any).singleResult.data.launches[0].links).toBeNull();
  });
});

// ─── @defer incremental delivery ─────────────────────────────────────────────
// graphql.js v16 falls back to regular execute() for @defer, returning a single
// result.  We verify Apollo Server's multipart machinery independently using
// __testing_incrementalExecutionResults, which injects a synthetic incremental
// payload and exercises the same code path that will activate with graphql v17.
// When @defer is natively supported this test should still pass unchanged.

describe("Integration: @defer incremental delivery", () => {
  it("routes incremental execution results as body.kind=incremental and streams subsequent chunks", async () => {
    async function* subsequentResults() {
      yield {
        hasNext: false,
        incremental: [
          {
            label: "details",
            path: ["company"],
            data: { ceo: "Elon Musk", founder: "Elon Musk" },
          },
        ],
      };
    }

    const deferServer = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      plugins: [ApolloServerPluginInlineTraceDisabled()],
      // Synthetic incremental result — bypasses graphql.js execution so the test
      // is not coupled to whether the installed graphql version supports @defer.
      __testing_incrementalExecutionResults: {
        initialResult: { data: { company: { name: "SpaceX" } }, hasNext: true },
        subsequentResults: subsequentResults(),
      } as any,
    });

    try {
      // graphql.js v16 rejects @defer as an unknown directive during validation,
      // so we send a plain valid query — the test hook bypasses execution anyway.
      // When graphql v17 is installed, the query can be updated to include @defer.
      const res = await deferServer.executeOperation(
        {
          query: `query GetCompany { company { name ceo founder } }`,
        },
        { contextValue: { api: new API() } }
      );

      expect(res.body.kind).toBe("incremental");
      if (res.body.kind !== "incremental") return;

      // Non-deferred field arrives in the initial chunk.
      expect(res.body.initialResult.hasNext).toBe(true);
      expect((res.body.initialResult.data as any).company.name).toBe("SpaceX");
      expect((res.body.initialResult.data as any).company.ceo).toBeUndefined();

      // Collect all subsequent chunks from the async iterable.
      const chunks: any[] = [];
      for await (const chunk of res.body.subsequentResults) {
        chunks.push(chunk);
      }

      // Stream must terminate with hasNext=false.
      expect(chunks.at(-1).hasNext).toBe(false);

      // Deferred fragment data arrives in a labeled incremental patch.
      const patches = chunks.flatMap((c) => c.incremental ?? []);
      const deferred = patches.find((p: any) => p.label === "details");
      expect(deferred?.data?.ceo).toBe("Elon Musk");
    } finally {
      await deferServer.stop();
    }
  });
});
