"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const subgraph_1 = require("@apollo/subgraph");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
describe('Contract: Production Query Compliance', () => {
    const SCHEMA_PATH = path_1.default.resolve(__dirname, '../../schema.graphql');
    const schemaSDL = (0, fs_1.readFileSync)(SCHEMA_PATH, 'utf-8');
    const schema = (0, subgraph_1.buildSubgraphSchema)({
        typeDefs: (0, graphql_tag_1.default)(schemaSDL),
        resolvers: {}
    });
    const productionQueries = [
        {
            name: 'GetLaunches',
            query: `
        query GetLaunches {
          launches {
            mission_name
            launch_date_utc
          }
        }
      `
        }
    ];
    productionQueries.forEach(({ name, query }) => {
        it(`should validate production query "${name}" against the schema`, () => {
            const document = (0, graphql_1.parse)(new graphql_1.Source(query));
            const errors = (0, graphql_1.validate)(schema, document);
            if (errors.length > 0) {
                const details = errors.map(e => `[COMPLIANCE ERROR] ${e.message}`).join('\n');
                throw new Error(`Production query breakage detected for "${name}":\n${details}`);
            }
            expect(errors).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=query.compliance.test.js.map