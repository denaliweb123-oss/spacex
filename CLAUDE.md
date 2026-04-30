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

`src/index.ts` imports `./graphql/security/validationRules` and `./graphql/security/errorFormatter` — these modules handle query depth/complexity limits and error sanitization. They must exist for the server to build.

## Testing

Tests use Jest with `ts-jest`. All test files live under `src/__tests__/`.

- **[src/__tests__/repo.test.ts](src/__tests__/repo.test.ts)** — Integration tests using `server.executeOperation()` against an in-memory Apollo Server instance (no network calls).
- **[src/__tests__/autonomous/](src/__tests__/autonomous/)** — AI-driven autonomous tests covering contract, security, schema integrity, performance, and service logic.

Note: some `.test.ts` files are currently located in `.github/workflows/` — these belong in `src/__tests__/` and should be moved before they are executed by Jest (Jest roots are configured to `src` only).

## CI/CD

- **[.github/workflows/ci.yml](.github/workflows/ci.yml)** — Runs on every push: `npm install` → `npm test` → Apollo Rover schema check against Apollo Studio (requires `APOLLO_KEY` and `APOLLO_GRAPH_REF` secrets).
- **[.github/workflows/publish-schema.yaml](.github/workflows/publish-schema.yaml)** — Publishes schema to Apollo Studio on push to `main` (also requires `PRODUCTION_URL`).
- **[.github/workflows/autonomous-qe.yml](.github/workflows/autonomous-qe.yml)** — Runs autonomous QE test suites.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 4001) |
| `NODE_ENV` | Set to `production` to disable introspection |
| `APOLLO_KEY` | Apollo Studio API key |
| `APOLLO_GRAPH_REF` | Apollo graph reference (e.g. `spacex-l4uc6p@main`) |
| `PRODUCTION_URL` | Production router URL for schema publish |

## Schema Changes

After modifying `schema.graphql`, always run `npm run codegen` to regenerate resolver types before running TypeScript compilation. The CI build will fail if generated types are out of sync.
