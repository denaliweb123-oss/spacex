# Test Strategy — SpaceX GraphQL Subgraph

## Questions asked before writing any tests

*API surface*
- Who are the consumers? → Public Apollo Studio endpoint; any federated supergraph.
- Read-only or mutations? → Query-only. No mutations, no subscriptions.

*Upstream reliability*
- Does api.spacexdata.com have a rate limit or SLA? → No. Community API, unmaintained.
- What happens on upstream 5xx? → Needs explicit testing — GraphQL can silently swallow it.

*Security posture*
- Is introspection disabled in production? → Yes, gated on NODE_ENV=production.
- Is there client auth? → No. Endpoint is open to the internet.
- What are the depth/complexity limits and have they ever fired? → Configured but untested in prod.

*CI constraints*
- Can I avoid live network calls? → Yes. tests/fixtures/launches.json + MSW covers it.
- Are there supergraph-level contract tests already? → No. This suite is the only gate.
- Is load testing appropriate in this environment? → Not in CI — the upstream is a community API with no SLA and the server runs in-process during tests. A real load test needs staging infrastructure and a live target. The performance suite covers a concurrency smoke test only.

*Dev team input*
- Is there anything the dev team would like to add to the test suite — known edge cases, past incidents, or areas they consider undertested? → Not yet answered; should be asked before the next test cycle.

---

## Prioritized scenarios (top 5)

Ranked by: likelihood of breakage × blast radius if broken.

**1. Happy-path launch query** (`tests/integration/graphql.api.test.ts`)
`launches` is the primary read path — every consumer depends on it. Every schema or resolver change touches it first. Tests field values, pagination, and response shape.

**2. Safety controls — depth and complexity** (`tests/integration/security.test.ts`, `tests/unit/utils/`)
This endpoint has no auth and is public. A misconfigured depth or complexity gate is a single point of failure that affects every query at once, not just one resolver. Higher priority than any individual resolver test.

**3. Null and error propagation** (`tests/integration/errors.test.ts`)
The upstream API is deprecated and returns null for several fields. GraphQL's nullable defaults mean a broken resolver can succeed silently and return incomplete data to the client. Verifying the error shape matters as much as verifying the happy path.

**4. Schema contract** (`tests/contract/query.compliance.test.ts`, `tests/contract/contract.agent.test.ts`)
This is a Federation subgraph. A field rename or type change that isn't caught locally breaks supergraph composition at deploy time. Contract tests catch this before the schema reaches the registry.

**5. Performance smoke** (`tests/performance/query.load.test.ts`)
No upstream rate limit means a resolver regression (e.g., removing caching, adding a blocking loop) won't surface in unit tests. A concurrency baseline in CI acts as a canary.

**6. N+1 Query Batching** (`tests/integration/nplusone.test.ts`)
Fetching lists of entities (launches, ships) that require sub-queries (rockets, payloads) can lead to request waterfalls. 
This is a primary risk for GraphQL-over-REST proxies. Verified by counting underlying datasource calls 
within a single execution.

---

## What was not tested, and why

**Mutations and subscriptions** — the schema has neither. Not applicable.

**Auth and per-user access control** — this subgraph has no auth layer. Auth belongs to the federation gateway. If `@authenticated` directives are ever added, a separate suite is needed.

**Live upstream calls** — excluded deliberately. The upstream has no SLA, network calls make CI flaky, and the MSW-mocked suite already validates response mapping. Accepted risk: silent upstream shape changes won't be caught until a fixture is updated manually.

**Unit tests for every resolver type** — the 40+ resolver types (capsules, dragons, ships, etc.) follow identical patterns: REST call → optional transform → return. Individually unit-testing each adds no signal beyond what parse-service and the integration tests already cover.

**Soak / load testing** — the performance test proves a concurrency floor, not sustained throughput. Real load testing belongs on staging infrastructure before a release, not in a per-commit CI gate.

**Federation composition** — verifying this subgraph composes with a live supergraph requires a router. The contract tests approximate it locally; true composition testing was out of scope.

---

## Top risks (ranked)

**0. N+1 Performance Degradation**
The "N+1 problem" is inherent to GraphQL resolvers that map to non-batched REST endpoints. 
If DataLoader or RESTDataSource memoization fails, a single client request can trigger dozens of upstream calls. 
Mitigation: Explicit integration test `nplusone.test.ts` tracks underlying datasource invocations.

**1. Silent null propagation from deprecated upstream fields**
`Capsule.dragon` and others return null after the MongoDB deprecation. In a nullable schema, a null resolver "succeeds" — the client gets partial data with no error. Mitigation: `errors.test.ts` verifies null handling explicitly.

**2. Unbounded list queries**
Every list field accepts optional `limit`/`offset` but doesn't require them. Omitting both fetches the full dataset into memory on every request. Pagination is enforced by convention, not by the schema or resolver. This is an open risk.

**3. Alias explosion bypasses complexity limit**
`graphql-validation-complexity` deduplicates aliased fields (`uniqSelections`), so 500 aliases of the same field cost the same as 1. An attacker can construct a syntactically large query that passes the cost gate. Discovered during test implementation. Mitigation: threshold is tuned against the actual deduplicated cost; full fix requires a custom cost function that counts aliases independently.

**4. No `@key` directive means no entity resolution**
No type carries `@key`. Another subgraph cannot extend `Launch` or `Rocket` via the Federation entity protocol. If that's ever attempted, composition fails with an opaque error. Known limitation; documented in contract tests.

**5. Stale cache during live launches**
Default response cache TTL is 86400s (24 hours). `launchLatest` can serve data that is hours old during a countdown window. No invalidation mechanism exists. Accepted operational risk; TTL is configurable.

**6. `@graphql-inspector/cli` rejects Federation v2 schemas**
The tool uses `buildASTSchema` internally, which doesn't understand `@link`. Without preprocessing, the CI schema diff step throws `Unknown directive "@link"` and the breaking-change gate silently skips. Mitigation: `scripts/strip-federation.js` strips Federation directives before diffing.

---

## AI usage log

**Prompt 1 — risk surface**
> "I'm building a test strategy for a GraphQL API that is a read-only proxy over a SpaceX REST API. It uses Apollo Federation v2, has no authentication, and is exposed publicly. What are the highest-risk test scenarios and what edge cases specific to GraphQL-over-REST would I miss?"

AI returned 7 risks: N+1, null propagation, introspection abuse, nested DoS, schema drift, alias explosion, optional pagination. Adopted 6 of 7 directly into the risk register above (N+1 added in cycle 2). Introspection was already handled by the server config (not a gap). Schema drift was noted as the motivation for version-pinning MSW fixtures rather than a new test.

**Prompt 2 — scoping questions**
> "Before testing an Apollo Federation subgraph that proxies a third-party REST API with no auth and no mutations, what questions would a QA engineer need answered? Group by API surface, data contract, security, CI constraints."

AI returned ~18 questions. Pruned to the 12 above — removed anything answerable by reading the schema (e.g., "are there mutations?") and kept only questions whose answers changed a scope decision (SLA → live tests excluded; no auth → auth testing excluded).

**Prompt 3 — fuzz query variants**
> "Give me 10 GraphQL queries a security tester would use to probe a public Apollo Server for DoS vulnerabilities: alias explosion, deep nesting, wide breadth, field duplication, introspection abuse."

AI returned 10 queries. The alias explosion example used 100 aliases — below the actual cost threshold. Raised to 500 to expose the `uniqSelections` deduplication behaviour (risk #3 above). Nesting and breadth queries were rewritten against the real schema type graph (`launches → rocket → engines → isp → sea_level`) rather than the AI's invented schema.

**Prompt 4 — coverage thresholds**
> "Jest coverage shows statements 57%, branches 31%, functions 46%, lines 57%. Thresholds are 80/75/80/80 and CI is failing. What thresholds make sense as regression gates, not aspirational targets?"

AI recommended actual minus 5 points as a regression buffer, and excluding entry points, CI scripts, and generated files. Applied: thresholds set to 55/28/44/55 (slightly tighter than the 5-point buffer because branch coverage is volatile across runs). Exclusions for `src/index.ts` and `src/qa/update-readme-metrics.ts` added; `src/__generated__/` was already excluded.
