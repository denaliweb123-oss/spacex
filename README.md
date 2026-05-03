# SpaceX GraphQL API

![CI](https://github.com/apollographql/subgraph-template-typescript-apollo-server/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Discord](https://img.shields.io/discord/1022972389463687228?logo=discord&logoColor=white&color=blue&style=flat&label=Discord)
<!-- README_BADGES_START -->
![Coverage](https://img.shields.io/badge/coverage-89.9%25-brightgreen)
<!-- README_BADGES_END -->

An Apollo Federation v2 subgraph that exposes SpaceX historical launch, rocket, capsule, ship, and payload data as a typed GraphQL API. Backed by the [r-spacex REST API](https://github.com/r-spacex/SpaceX-API). Try it live in [Apollo Explorer](https://studio.apollographql.com/public/spacex-l4uc6p/explorer?variant=main).

> Some fields are marked `@deprecated` — the upstream MongoDB was retired in favour of Launch Library 2. The REST API remains in place but is unmaintained.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 22.0 |
| npm | >= 10.0 |

## Getting Started

```bash
git clone https://github.com/apollographql/subgraph-template-typescript-apollo-server.git
cd subgraph-template-typescript-apollo-server
npm install       # installs deps and runs the build (postinstall hook)
npm run dev       # dev server with hot reload on port 4001
```

```bash
npm run build     # codegen + TypeScript compile
npm start         # serve dist/index.js
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4001` | Server listen port |
| `NODE_ENV` | No | — | Set to `production` to disable introspection |
| `APOLLO_KEY` | CI only | — | Apollo Studio API key |
| `APOLLO_GRAPH_REF` | CI only | — | Graph reference, e.g. `SpaceX-pxxbxen@current` |
| `PRODUCTION_URL` | CI only | — | Production router URL for schema publish |

Copy `.env.example` to `.env` for local development.

## Endpoint

Cloud router: `https://main--spacex-pxxbxen.apollographos.net/graphql`

---

## Testing

<!-- README_STATS_START -->
This project uses a layered, seven-stage CI pipeline for GraphQL schema stability, runtime safety, and regression detection. All **271 tests** pass across **37 suites**; HTTP is fully mocked by MSW so no live network calls occur in CI.
<!-- README_STATS_END -->

### Test structure

<!-- README_TEST_STRUCTURE_START -->
| Layer | Directory | Files |
|---|---|---|
| Unit — resolvers | `tests/unit/resolvers/` | launches, payloads, history.resolver, launchpad.resolver, ships.resolver, repo, snapshot |
| Unit — services | `tests/unit/services/` | parse-service, limit-offset-service |
| Unit — utils | `tests/unit/utils/` | depth-limit, complexity, rate-limit, safety.errorHandling, server-factory, argument-fixtures |
| Unit — qa | `tests/unit/qa/` | anomaly-agent, coverage-agent, runner.anomaly, runner.writemetrics, replay-failure, query-generator.skip |
| Integration | `tests/integration/` | graphql.api, security, errors, caching, deprecated, nplusone, api, autonomous.ai.qa, autonomous.security.agent |
| Contract | `tests/contract/` | query.compliance (37 root fields), schema.diff, query-generator, contract.agent |
| E2E | `tests/e2e/` | full.graphql.flow |
| Performance | `tests/performance/` | query.load |
<!-- README_TEST_STRUCTURE_END -->

Mocks and fixtures live in `tests/mocks/` (MSW handlers + server helpers) and `tests/fixtures/` (pinned REST launch data).

### Running tests

```bash
npm test                   # all suites
npm run test:unit          # unit only
npm run test:integration   # integration only
npm run test:contract      # contract only
npm run test:coverage      # unit + integration with coverage report
npm run test:perf          # performance smoke (serial)
npm run test:watch         # interactive watch mode
npm run test:spacex        # SpaceX tests only (excludes Countries API)
npm run test:countries     # Countries API tests only (local, not in CI)
npm run readme:update      # run tests + coverage, then patch this file
npm run schema:heal        # regenerate query compliance tests from current schema
```

### CI/CD pipeline

`.github/workflows/ci.yml` — runs on every push and pull request (Node 22).

| Stage | Job | Command | Hard fail condition |
|---|---|---|---|
| 1 | Install | `npm ci` | Dependency resolution failure |
| 2 | Lint | `npm run lint` | Any ESLint error |
| 3 | Unit | `npm run test:unit -- --ci` | Any test failure |
| 4 | Integration + coverage | `npm run test:integration -- --ci` → `npm run test:coverage -- --ci` | Test failure or coverage below threshold |
| 5 | Contract + schema diff | `npm run test:contract -- --ci` → `graphql-inspector diff` | Contract failure or breaking schema change |
| 6 | Build | `npm run build` + schema validation | Compile error or invalid schema |
| 7 | Performance | `npm run test:perf -- --ci` | Latency threshold exceeded |

Stage 5 runs `schema.diff.test.ts` (SDL snapshot + `@graphql-inspector/core` breaking-change detection against `origin/main`) as part of `test:contract`, then also runs `graphql-inspector diff` as a CLI step after stripping Federation v2 directives via `scripts/strip-federation.js`. An optional Apollo Rover `subgraph check` runs when `APOLLO_KEY` and `APOLLO_GRAPH_REF` are present.

### Coverage

Enforced as a hard gate in Stage 4:

| Metric | Threshold | Current |
|---|---:|---:|
<!-- README_COVERAGE_START -->
| Statements | 55% | 89.91% |
| Branches   | 60% | 84.94% |
| Functions  | 44% | 90.11% |
| Lines      | 55% | 91.63% |
<!-- README_COVERAGE_END -->

Excluded: `src/index.ts`, `src/qa/update-readme-metrics.ts`, `src/__generated__/`.

### Autonomous QA

<!-- AUTONOMOUS_QA_METRICS_START -->
<!-- auto-generated by update-readme.ts — do not edit between markers -->
**Autonomous QA — last 1 run(s):**
| Run | Date | Queries | Anomalies | High |
|---|---|---|---|---|
| latest | 2026-05-02 | 185 | 0 | 0 |
<!-- AUTONOMOUS_QA_METRICS_END -->

<!-- README_QA_DESC_START -->
`src/qa/` derives queries from the live schema, fuzzes them, flags anomalies (latency > 50 ms or unexpected errors), and persists failures to `qa-memory.json` for replay on every subsequent run. See [`docs/test-strategy.md`](docs/test-strategy.md) for the full strategy.
<!-- README_QA_DESC_END -->

---

## Contributing

1. Fork and create a branch from `main`.
2. Run `npm install`.
3. Make your changes and verify locally:
   ```bash
   npm run lint    # zero errors
   npm test        # all suites pass
   npm run build   # clean compile
   ```
4. Open a pull request — the CI pipeline must pass before merge.

For bugs or feature requests open an [issue](https://github.com/apollographql/subgraph-template-typescript-apollo-server/issues).

## License

[MIT](./LICENSE) — Copyright © 2022– Apollo Graph, Inc.

---

<a href="https://discord.gg/graphos"><img src="https://discord.com/api/guilds/1022972389463687228/widget.png?style=banner2"></a>
