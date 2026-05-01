# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpaceX GraphQL API — an Apollo Federation v2 subgraph that proxies SpaceX historical launch data from a REST API (`https://api.spacexdata.com/v4`) into a typed GraphQL interface. The public endpoint is available via Apollo Studio.

## Commands

```bash
npm install        # Install dependencies and auto-run build (postinstall hook)
npm run dev        # Start dev server with hot reload (nodemon)
npm run build      # codegen + tsc (must run before starting)
npm run codegen    # Regenerate src/__generated__/resolvers-types.ts from schema.graphql
npm start          # Run compiled server (dist/index.js)
npm test           # Run all Jest tests
```

**Run a single test file:**
```bash
npm test -- src/__tests__/repo.test.ts
npm test -- src/__tests__/autonomous/security.agent.test.ts
```

**Run tests by name pattern:**
```bash
npm run test -- --testNamePattern="Contract"
```

## Architecture

### Data Flow

```
GraphQL Query → Apollo Server (index.ts)
  → Resolver (src/resolvers/*.ts)
  → API client (src/api.ts) — HTTP fetch to SpaceX REST API
  → parse-service.ts (data transformation)
  → limit-offset-service.ts (pagination)
  → GraphQL Response
```

### Key Files

- **[src/index.ts](src/index.ts)** — Apollo Server bootstrap: federation schema assembly, security plugins (depth limit, rate limit, complexity), response caching (86400s default max-age), introspection disabled when `NODE_ENV=production`, server port from `PORT` env var (default 4001).
- **[src/api.ts](src/api.ts)** — Singleton REST client with 40+ methods covering all SpaceX resources (launches, rockets, capsules, ships, cores, dragons, launchpads, landpads, missions, payloads, history, roadster, company).
- **[schema.graphql](schema.graphql)** — Source of truth for the GraphQL schema; Apollo Federation `@link` directive wired for v2.3.
- **[src/resolvers/](src/resolvers/)** — One file per domain type; `resolvers/index.ts` merges them all.
- **[src/__generated__/resolvers-types.ts](src/__generated__/resolvers-types.ts)** — Auto-generated; do not edit manually. Regenerate with `npm run codegen`.
- **[codegen.yml](codegen.yml)** — GraphQL CodeGen config; outputs resolver types with federation support and `DataSourceContext` as the context type.

### Context

Each request receives a `DataSourceContext` (defined in [src/types/DataSourceContext.ts](src/types/DataSourceContext.ts)) that carries a per-request instance of the API client. Resolvers access it as `context.dataSources`.

### Security Modules

[src/graphql/security/validationRules.ts](src/graphql/security/validationRules.ts) and [src/graphql/security/errorFormatter.ts](src/graphql/security/errorFormatter.ts) handle query depth/complexity limits and error sanitization. Both are imported by `src/index.ts` and must exist for the server to build.

### Autonomous QA System

[src/qa/runner.ts](src/qa/runner.ts) — orchestrates a full autonomous QA cycle: generates queries from the live schema, fuzzes them, executes each against an in-memory server, and detects anomalies. Called by `src/__tests__/autonomous/ai.qa.test.ts`.

- [src/qa/generators/query-generator.ts](src/qa/generators/query-generator.ts) — derives valid GraphQL queries from schema introspection.
- [src/qa/agents/fuzz-agent.ts](src/qa/agents/fuzz-agent.ts) — produces malformed/edge-case variants of a query.
- [src/qa/agents/anomaly-agent.ts](src/qa/agents/anomaly-agent.ts) — flags responses that exceed 1500 ms or contain errors.
- [src/qa/agents/coverage-agent.ts](src/qa/agents/coverage-agent.ts) — records failures for CI artifact upload.
- [src/qa/memory/qa-memory.json](src/qa/memory/qa-memory.json) — persists QA state between runs.

## Testing

Tests use Jest with `ts-jest`. All test files live under `src/__tests__/`. Jest `roots` is set to `src`, so files outside that directory are not picked up.

- **src/__tests__/repo.test.ts**, **src/__tests__/launches.integration.test.ts**, **src/__tests__/snapshot.test.ts** — Integration tests via `server.executeOperation()` against an in-memory Apollo Server.
git push
- **Unit tests:** `api.test.ts`, `limit-offset-service.test.ts`, `parse-service.test.ts`, `errors.test.ts`.
- **[src/__tests__/autonomous/](src/__tests__/autonomous/)** — AI-driven tests: `contract.agent.test.ts`, `security.agent.test.ts`, `schema.intelligence.test.ts`, `performance.agent.test.ts`, `service.agent.test.ts`, `ai.qa.test.ts` (runs the full autonomous QA cycle via `src/qa/runner.ts`).

## Test Strategy

[docs/test-strategy.md](docs/test-strategy.md) documents the full QA approach across eight dimensions (schema/contract, functional, security, performance, caching, observability, CI/CD, resilience). Consult it before adding or restructuring test suites.

## CI/CD

- **[.github/workflows/ci.yml](.github/workflows/ci.yml)** — Runs on every push: `npm install` → `npm test` → Apollo Rover schema check (requires `APOLLO_KEY` and `APOLLO_GRAPH_REF`).
- **[.github/workflows/publish-schema.yaml](.github/workflows/publish-schema.yaml)** — Publishes schema to Apollo Studio on push to `main` (requires `PRODUCTION_URL`).
- **[.github/workflows/autonomous-qe.yml](.github/workflows/autonomous-qe.yml)** — Full autonomous QE pipeline on every push: schema diff against production (graphql-inspector), schema lint, contract tests, N+1 detection gate (PRs only), null-handling suite, autonomous QA suite (`src/__tests__/autonomous/`), failure-report artifact upload (main only), and a weekly Monday auth audit cron.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 4001) |
| `NODE_ENV` | Set to `production` to disable introspection |
| `APOLLO_KEY` | Apollo Studio API key |
| `APOLLO_GRAPH_REF` | Apollo graph reference (e.g. `SpaceX-pxxbxen@current`) |
| `PRODUCTION_URL` | Production router URL for schema publish |

## Schema Changes

After modifying `schema.graphql`, always run `npm run codegen` to regenerate resolver types before running TypeScript compilation. The CI build will fail if generated types are out of sync.
