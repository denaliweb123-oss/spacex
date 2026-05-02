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

<!-- README_STATS_START -->
This project uses a layered, seven-stage CI pipeline for GraphQL schema stability, runtime safety, and regression detection. All **271 tests** pass across **37 suites**; HTTP is fully mocked by MSW so no live network calls occur in CI.
<!-- README_STATS_END -->

### Testing Framework & Tooling

| Category | Tooling |
|---|---|
| Test Runner | Jest 29 + ts-jest (Node 22) |
| GraphQL Execution | Apollo Server v4 in-process test client (`executeOperation`) |
| HTTP Mocking | MSW v2 (`msw/node`) — intercepts REST calls to `api.spacexdata.com` and GraphQL calls to `countries.trevorblades.com` |
| Schema Validation | `buildSubgraphSchema` (@apollo/subgraph) + optional Rover check |
| Schema Diff | `@graphql-inspector/cli` diff with Federation v2 preprocessing (`scripts/strip-federation.js`) |
| Security Controls | `graphql-depth-limit` + `graphql-validation-complexity` |
| Autonomous QA | Custom agents (`src/qa/`) |
| Linting | ESLint (TypeScript rules) |
| CI/CD | GitHub Actions — 7 sequential stages |

### Test Suite Structure

All test files live under `tests/` (37 suites, 271 tests):

```
tests/
├── unit/
│   ├── resolvers/        launches, payloads, launchpad, ships, history, snapshot, repo
│   ├── services/         parse-service, limit-offset-service
│   ├── utils/            depth-limit, complexity, rate-limit, error-handling, server-factory,
│   │                     argument-fixtures
│   └── qa/               runner (anomaly, write-metrics), anomaly-agent, coverage-agent,
│                         query-generator, replay-failure
├── integration/          SpaceX GraphQL API, errors, security, caching, N+1,
│                         autonomous QA + security agent, REST API client,
│                         Countries GraphQL API (external API integration)
├── contract/             query compliance, contract agent, query generator
├── performance/          SpaceX concurrent query load, Countries API latency gate
├── e2e/                  full SpaceX query flow (MSW end-to-end)
├── mocks/                SpaceX REST handlers, Countries GraphQL handlers, MSW server helpers
└── fixtures/             launches.json (pinned REST fixture)
```

### Test Coverage Layers

1. **Unit** — Resolver field-mapping, `parse-service` (weight derivation, field renames), `limit-offset-service` (pagination edge cases), security middleware behavior, error masking, and autonomous QA agent behavior (anomaly detection, failure recording, query generation).
2. **Integration** — Full `Query → Resolver → Service → API` pipeline executed against MSW-intercepted REST responses; covers happy path, error propagation, null handling, security rule enforcement, and autonomous anomaly detection. *(CI only: SpaceX resolvers. Countries API integration tests run locally via `test:countries`.)*
3. **Contract** — Production query shapes validated against the built subgraph schema; root field type assertions; schema-driven query generation for all 40+ resolver entry points.
4. **E2E** — MSW-intercepted launch queries and 404 null-propagation verified through the complete server stack.
5. **Performance** — Concurrent `launchesPast` queries under 2000 ms. *(CI only: SpaceX performance. Countries API latency tests — single full-schema query under 500 ms, 250-country dataset under 1000 ms, 10 concurrent requests under 2000 ms — run locally via `test:countries`.)*
6. **Autonomous QA** — Schema-derived queries, fuzz variants, anomaly detection (latency + error flags), failure persistence, and replay. Zero high-severity anomalies required to pass.

### Autonomous QA System

The `src/qa/` framework generates GraphQL operations from the live schema and runs them as a CI gate.

* **Schema-driven query generation** — derives root-field queries including required-argument fixtures (`tests/contract/query-generator.test.ts`).
* **Fuzz testing** — mutates queries to simulate malformed input and adversarial shapes.
* **Anomaly detection** — flags responses exceeding 1500 ms or containing unexpected errors.
* **Failure memory and replay** — persists high-severity failures to `src/qa/memory/qa-memory.json` and replays them as Jest test cases until resolved.

### Last Recorded QA Metrics

<!-- AUTONOMOUS_QA_METRICS_START -->
<!-- auto-generated by update-readme.ts — do not edit between markers -->
**Last Recorded Autonomous QA Metrics (Sat, 02 May 2026 01:30:23 GMT):**
| Metric | Value |
|---|---|
| Queries Executed | 185 |
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

> **Countries API tests are excluded from all CI stages.** Run them locally with `npm run test:countries`. The `test:integration`, `test:coverage`, and `test:perf` scripts each pass `--testPathIgnorePatterns="countries"` so they never execute in the pipeline.

The schema diff step (Stage 5) strips Apollo Federation v2 directives via `scripts/strip-federation.js` before invoking `@graphql-inspector/cli`, which uses plain `buildASTSchema` and would otherwise reject the `@link` directive.

An optional Apollo Rover `subgraph check` runs in Stage 5 when `APOLLO_KEY` and `APOLLO_GRAPH_REF` secrets are present.

### Coverage

Coverage is enforced as a hard CI gate in Stage 4. Thresholds are set as regression floors against the current measured baseline:

| Metric | Threshold | Current |
|---|---:|---:|
<!-- README_COVERAGE_START -->
| Statements | 55% | 89.91% |
| Branches   | 60% | 84.94% |
| Functions  | 44% | 90.11% |
| Lines      | 55% | 91.63% |
<!-- README_COVERAGE_END -->

Excluded from measurement: `src/index.ts` (server entry point), `src/qa/update-readme-metrics.ts` (CI script), `src/__generated__/` (codegen output).

### Running Tests Locally

```bash
npm test                            # all 37 suites (SpaceX + Countries)
npm run test:spacex                 # SpaceX tests only (35 suites, 239 tests)
npm run test:countries              # Countries API tests only (2 suites, 32 tests)
npm run test:unit                   # unit tests only
npm run test:integration            # integration tests only
npm run test:contract               # contract tests only
npm run test:coverage               # unit + integration with coverage report
npm run test:perf                   # performance smoke (serial)
npm run test:watch                  # interactive watch mode for local development
npm run readme:update               # re-run tests, measure coverage, patch README in place
npm test -- tests/integration/security.test.ts          # single file
npm test -- --testNamePattern="filter operators"         # by test name
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
