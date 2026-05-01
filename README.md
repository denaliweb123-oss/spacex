# SpaceX GraphQL API

![Discord](https://img.shields.io/discord/1022972389463687228?logo=discord&logoColor=white&color=blue&style=flat&label=Discord)

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

## Accessing this graph

🛰 You can send operations to this graph through its cloud router: https://main--spacex-pxxbxen.apollographos.net/graphql

## Quality Engineering & Autonomous Testing

This project uses layered automated QE for GraphQL schema stability, runtime safety, and regression detection.

* **Jest:** Core unit and integration testing with `ts-jest`.
* **Apollo schema validation:** Local subgraph validation always runs; Rover schema checks run when Apollo credentials are configured.
* **Autonomous QA:** A custom framework (`src/qa/`) derives queries from the schema, fails on high-severity anomalies, and replays persisted failures.

```
GraphQL (Resolvers)
        ↓
Service Layer (parse-service, pagination)
        ↓
API Layer (REST integration)
        ↓
QA Agents (Schema, Contract, Fuzz, Anomaly)
```

### Testing Framework & Tooling

| Category | Tooling |
|---|---|
| Test Runner | Jest (ts-jest) |
| GraphQL Execution | Apollo Server test client |
| Schema Validation | Apollo subgraph validation + optional Rover check |
| Mocking | Jest mocks |
| Security Controls | Depth + complexity limits |
| Autonomous QA | Custom agents (`src/qa/`) |
| CI/CD | GitHub Actions |

### Autonomous QA System

The autonomous QA system generates GraphQL operations from the schema and runs them as part of CI.

* **Schema-driven query generation:** Derives root-field queries from the schema, including required-argument fixtures.
* **Fuzz testing:** Mutates queries to simulate malformed input and adversarial query shapes.
* **Anomaly detection:** Flags latency spikes and unexpected GraphQL execution errors.
* **Failure memory and replay:** Persists high-severity failing queries and replays them as Jest test cases.

### Test Coverage Layers

1. **Unit tests:** Resolver logic, `parse-service`, `limit-offset-service`, and API boundary behavior.
2. **Integration tests:** End-to-end GraphQL execution against mocked REST responses.
3. **Contract tests:** Schema stability validation and optional Apollo Rover checks when `APOLLO_KEY` and `APOLLO_GRAPH_REF` are configured.
4. **Security tests:** Query depth, complexity, introspection behavior, query injection simulation, and production error masking.
5. **Performance and resilience:** Concurrent query smoke tests, latency anomaly detection, and null-handling scenarios.
6. **Autonomous QA:** Schema-generated queries, fuzz mutation testing, anomaly detection, failure persistence, and replay.

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

These metrics are written to `qa-metrics.json` when the autonomous runner is invoked with metrics writing enabled. The Jest gate disables metrics-file writes to keep normal test runs deterministic.

### CI/CD Quality Gates

The active GitHub Actions workflow is `.github/workflows/ci.yml`. It runs on push, pull request, and manual dispatch with Node 22.

Enforced gates today:

* `npm ci`
* `npm run build` (`graphql-codegen` + `tsc`)
* `npm test -- --coverage --runInBand`
* Apollo subgraph schema validation
* Apollo Rover `subgraph check` when `APOLLO_KEY` and `APOLLO_GRAPH_REF` are configured
* Autonomous QA replay/generation test with zero high-severity anomalies

Coverage is measured and printed in CI, but no minimum percentage threshold is currently enforced. Pull requests are blocked only if this CI workflow is configured as a required status check in repository branch protection.

Latest local coverage measurement from this test suite:

| Metric | Value |
|---|---:|
| Statements | 63.11% |
| Branches | 31.54% |
| Functions | 46.09% |
| Lines | 65.20% |

### Coverage Strategy

Coverage goals:

* High coverage on service-layer business logic
* Full validation of API-boundary behavior
* Critical-path coverage for GraphQL resolvers

### Running Tests

```bash
npm test
npm test -- --coverage --runInBand
npm test -- src/__tests__/autonomous/ai.qa.test.ts
npx jest src/__tests__/autonomous/contract.agent.test.ts
npm test -- src/__tests__/autonomous
```

### Design Principles

* **Shift-left testing:** Catch issues before they reach a live environment.
* **Schema-first validation:** Treat GraphQL as a strict contract between service and client.
* **Defense-in-depth:** Implement security at the query, resolver, and API levels.
* **Continuous feedback:** Use generated queries, failure memory, and CI metrics to keep quality signals current.

This testing system currently provides a measured CI gate for build, type generation, schema validity, Jest coverage reporting, GraphQL security behavior, and autonomous QA anomaly detection. Future hardening should add enforced coverage thresholds once the current baseline is raised, plus a required branch-protection rule for the CI workflow.

Detailed strategy documentation can be found in `docs/test-strategy.md`.

## Questions or Issues

If you have any questions or issues with this project, come find us on Discord to talk about it!

<a href="https://discord.gg/graphos"><img src="https://discord.com/api/guilds/1022972389463687228/widget.png?style=banner2"></a>
