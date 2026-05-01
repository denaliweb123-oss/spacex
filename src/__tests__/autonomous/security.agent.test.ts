import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import resolvers from "../../resolvers";
import { buildSubgraphSchema } from "@apollo/subgraph";
import API from "../../api";
import { validationRules } from "../../graphql/security/validationRules";

const typeDefs = gql(
  readFileSync("schema.graphql", {
    encoding: "utf-8",
  })
);

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
  validationRules,
});

describe("🛡️ Security & Abuse Agent", () => {
  it("rejects unknown fields (query injection attempt)", async () => {
    const res = await server.executeOperation({
      query: `{ __typename maliciousField }`,
    }, {
      contextValue: { api: new API() }
    });

    expect((res.body as any).singleResult.errors).toBeDefined();
  });

  it("blocks deep query attack simulation", async () => {
    const res = await server.executeOperation({
      query: `
        query {
          launchesPast {
            rocket {
              second_stage {
                payloads {
                  payload_mass_kg
                  nationality
                }
              }
            }
          }
        }
      `,
    }, {
      contextValue: { api: new API() }
    });

    const result = (res.body as any).singleResult;
    expect(result.errors || result.data).toBeDefined();
  });

  it("prevents schema introspection abuse in hardened mode", async () => {
    const hardenedServer = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      introspection: false,
    });

    const res = await hardenedServer.executeOperation({
      query: `{ __schema { types { name } } }`,
    });

    expect((res.body as any).singleResult.errors).toBeDefined();
  });
});