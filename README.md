# SpaceX GraphQL API

![Discord](https://img.shields.io/discord/1022972389463687228?logo=discord&logoColor=white&color=blue&style=flat&label=Discord)
![CI](https://github.com/apollographql/subgraph-template-typescript-apollo-server/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/WdJd2w?referralCode=xsbY2R)

This graph is a recreation of the [SpaceXLand/api](https://github.com/SpaceXLand/api) project that was authored by [Carlos Rufo](https://github.com/itscarlosrufo). The code for this recreation is open source and can be viewed [here](https://github.com/apollographql/spacex).

The original project used a MongoDB that was deprecated in favor of Launch Library 2; you can read about the issue [here](https://github.com/r-spacex/SpaceX-API/issues/1243). The team plans to keep the REST API in place but unmaintained. This project utilized the REST API to implement the same schema, but there are some gaps that have been marked `@deprecated`. For example, `Missions` are not available in the REST API.

You can try querying this graph using [Explorer](https://studio.apollographql.com/public/spacex-l4uc6p/explorer?variant=main).

## What this graph is all about

Open Source GraphQL API for launch, rocket, core, capsule, starlink, launchpad, and landing pad data possibly by a community effort from [r-spacex](https://github.com/r-spacex/SpaceX-API).

This graph is meant for exploring historical SpaceX data. Any current space launch information can be found through [The Space Dev's Launch Library v2 (LLv2) effort](https://ll.thespacedevs.com/docs/). If you are interested in this effort, there are a couple ways you can get active in it:

1. Join [The Space Dev's Discord Server](https://discord.gg/p7ntkNA) to receive the latest updates
2. The Apollo DevRel team started up an [open sourced repository](https://github.com/apollographql/Space-Devs/issues) to create a GraphQL API for the LLv2. 
  a. You can query the data of this graph [here](https://studio.apollographql.com/public/space-devs/home?variant=main)
3. Join the [Apollo Discord Server](https://discord.gg/graphos) and we can help get you plugged in.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 22.0 |
| npm | >= 10.0 |

## Getting Started

```bash
git clone https://github.com/apollographql/subgraph-template-typescript-apollo-server.git
cd subgraph-template-typescript-apollo-server
npm install          # installs dependencies and runs the build (postinstall hook)
npm run dev          # start dev server with hot reload on port 4001
```

To run a production build:

```bash
npm run build        # codegen + TypeScript compile
npm start            # serve dist/index.js
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4001` | Server listen port |
| `NODE_ENV` | No | — | Set to `production` to disable introspection |
| `APOLLO_KEY` | CI only | — | Apollo Studio API key (schema check + publish) |
| `APOLLO_GRAPH_REF` | CI only | — | Apollo graph reference, e.g. `SpaceX-pxxbxen@current` |
| `PRODUCTION_URL` | CI only | — | Production router URL used by the schema publish workflow |

Copy `.env.example` to `.env` and fill in values as needed for local development.

## Accessing this graph

🛰 You can send operations to this graph through its cloud router: https://main--spacex-pxxbxen.apollographos.net/graphql

## Quality Engineering & Autonomous Testing

This project uses a layered, seven-stage CI pipeline for GraphQL schema stability, runtime safety, and regression detection. All 90 tests pass; HTTP is fully mocked by MSW so no live network calls occur in CI.

### Testing Framework & Tooling

| Category | Tooling |
|---|---|
| Test Runner | Jest + ts-jest (Node 22) |
| GraphQL Execution | Apollo Server in-process test client |
| HTTP Mocking | MSW v2 (`msw/node`) — intercepts all REST calls to `api.spacexdata.com` |
| Schema Validation | `buildSubgraphSchema` (@apollo/subgraph) + optional Rover check |
| Schema Diff | `@graphql-inspector/cli` diff with Federation v2 preprocessing (`scripts/strip-federation.js`) |
| Security Controls | `graphql-depth-limit` + `graphql-validation-complexity` |
| Autonomous QA | Custom agents (`src/qa/`) |
| Linting | ESLint (TypeScript rules) |
| CI/CD | GitHub Actions — 7 sequential stages |

### Test Suite Structure

All test files live under `tests/` (20 files, 90 tests):

```
tests/
├── unit/
│   ├── resolvers/        launches, snapshot, server bootstrap
│   ├── services/         parse-service, limit-offset-service
│   └── utils/            depth-limit, cost-limit, error-handling, server-factory
├── integration/          graphql API, errors, security, autonomous QA, security agent, REST API
├── contract/             query compliance, contract agent, query generator
├── performance/          concurrent query load + latency gate
├── e2e/                  full query flow (MSW end-to-end)
├── mocks/                MSW handlers + server helpers
└── fixtures/             launches.json (pinned REST fixture)
```

### Test Coverage Layers

1. **Unit** — Resolver field-mapping, `parse-service` (weight derivation, field renames), `limit-offset-service` (pagination edge cases), security middleware behavior, and error masking.
2. **Integration** — Full `Query → Resolver → Service → API` pipeline executed against MSW-intercepted REST responses; covers happy path, error propagation, null handling, security rule enforcement, and autonomous anomaly detection.
3. **Contract** — Production query shapes validated against the built subgraph schema; root field type assertions; schema-driven query generation for all 40+ resolver entry points.
4. **E2E** — MSW-intercepted launch queries and 404 null-propagation verified through the complete server stack.
5. **Performance** — Three concurrent `launchesPast` queries must complete in under 200 ms (in-process, no network); ten concurrent queries verified error-free.
6. **Autonomous QA** — Schema-derived queries, fuzz variants, anomaly detection (latency + error flags), failure persistence, and replay. Zero high-severity anomalies required to pass.

### Autonomous QA System

The `src/qa/` framework generates GraphQL operations from the live schema and runs them as a CI gate.

* **Schema-driven query generation** — derives root-field queries including required-argument fixtures (`tests/contract/query-generator.test.ts`).
* **Fuzz testing** — mutates queries to simulate malformed input and adversarial shapes.
* **Anomaly detection** — flags responses exceeding 1500 ms or containing unexpected errors.
* **Failure memory and replay** — persists high-severity failures to `src/qa/memory/qa-memory.json` and replays them as Jest test cases until resolved.

### Last Recorded QA Metrics

<!-- AUTONOMOUS_QA_METRICS_START -->
**Last Recorded Autonomous QA Metrics (Fri, 01 May 2026 16:39:17 GMT):**
| Metric | Value |
|---|---|
| Queries Executed | 105 |
| Anomalies Detected | 0 |
| High Severity | 0 |
| Medium Severity (Latency) | 0 |
<!-- AUTONOMOUS_QA_METRICS_END -->

Metrics are written to `qa-metrics.json` when the autonomous runner is invoked with metrics writing enabled. Normal Jest runs skip metrics-file writes to remain deterministic.

### CI/CD Pipeline

`.github/workflows/ci.yml` — runs on every push, pull request, and manual dispatch (Node 22). Stages run sequentially; each stage must pass before the next begins.

| Stage | Job | Command | Hard fail condition |
|---|---|---|---|
| 1 | Install | `npm ci` | Dependency resolution failure |
| 2 | Lint | `npm run lint` | Any ESLint error |
| 3 | Unit tests | `npm run test:unit -- --ci` | Any test failure |
| 4 | Integration tests + coverage | `npm run test:integration -- --ci` then `npm run test:coverage -- --ci` | Test failure or coverage below threshold |
| 5 | Contract tests + schema diff | `npm run test:contract -- --ci` then `@graphql-inspector/cli diff` | Contract failure or breaking schema change |
| 6 | Build | `npm run build` (`codegen` + `tsc`) + schema validation | Compile error or invalid schema |
| 7 | Performance smoke | `npm run test:perf -- --ci` | Latency threshold exceeded |

The schema diff step (Stage 5) strips Apollo Federation v2 directives via `scripts/strip-federation.js` before invoking `@graphql-inspector/cli`, which uses plain `buildASTSchema` and would otherwise reject the `@link` directive.

An optional Apollo Rover `subgraph check` runs in Stage 5 when `APOLLO_KEY` and `APOLLO_GRAPH_REF` secrets are present.

### Coverage

Coverage is enforced as a hard CI gate in Stage 4. Thresholds are set as regression floors against the current measured baseline:

| Metric | Threshold | Current |
|---|---:|---:|
| Statements | 55% | 64.06% |
| Branches | 28% | 32.08% |
| Functions | 44% | 48.36% |
| Lines | 55% | 65.94% |

Excluded from measurement: `src/index.ts` (server entry point), `src/qa/update-readme-metrics.ts` (CI script), `src/__generated__/` (codegen output).

### Running Tests Locally

```bash
npm test                            # all 20 suites
npm run test:unit                   # unit tests only
npm run test:integration            # integration tests only
npm run test:contract               # contract tests only
npm run test:coverage               # unit + integration with coverage report
npm run test:perf                   # performance smoke (serial)
npm test -- tests/integration/security.test.ts          # single file
npm test -- --testNamePattern="depth"                   # by test name
```

### Design Principles

* **Shift-left:** Schema validation and unit tests run before integration, which runs before build.
* **Schema-first contract:** Production query shapes are validated against the local schema on every push — breakage is caught before the registry.
* **Defense-in-depth:** Security enforced at the validation layer (depth + complexity), resolver layer (null propagation), and API layer (error masking).
* **No live network in CI:** MSW intercepts all REST traffic; the fixture in `tests/fixtures/launches.json` is version-pinned to prevent flakiness.
* **Continuous feedback:** Autonomous QA failure memory means a regression that appeared once will be retested on every subsequent run until resolved.

Detailed strategy documentation, including pre-testing questions, prioritized scenarios, conscious exclusions, top risks, and AI usage log: `docs/test-strategy.md`.

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository and create a branch from `main`.
2. Run `npm install` to set up the project.
3. Make your changes and ensure all checks pass locally:
   ```bash
   npm run lint        # ESLint — must produce zero errors
   npm test            # full test suite — all suites must pass
   npm run build       # codegen + TypeScript compile — must succeed
   ```
4. Open a pull request against `main`. The CI pipeline (lint → unit → integration → contract → build → performance) must pass before merge.

For bugs or feature requests, open an issue on [GitHub](https://github.com/apollographql/subgraph-template-typescript-apollo-server/issues).

## License

[MIT](./LICENSE) — Copyright © 2022– Apollo Graph, Inc.

## Questions or Issues

If you have any questions or issues with this project, come find us on Discord to talk about it!

<a href="https://discord.gg/graphos"><img src="https://discord.com/api/guilds/1022972389463687228/widget.png?style=banner2"></a>
