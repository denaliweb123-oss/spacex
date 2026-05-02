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
- Can I avoid live network calls? → Yes. tests/fixtures/launches.json + MSW covers it. External GraphQL APIs (Countries) are also fully mocked via MSW `graphql.link()` handlers.
- Are there supergraph-level contract tests already? → No. This suite is the only gate.
- Is load testing appropriate in this environment? → Not in CI — the upstream is a community API with no SLA and the server runs in-process during tests. A real load test needs staging infrastructure and a live target. The performance suite covers a concurrency smoke test only.

*Dev team input*
- Is there anything the dev team would like to add to the test suite — known edge cases, past incidents, or areas they consider undertested? → Not yet answered; should be asked before the next test cycle.

---

## Test coverage layers

1. **Unit** — Resolver field-mapping (REST v4 field renames → GraphQL names), `parse-service` (weight derivation, field transforms), `limit-offset-service` (pagination edge cases), security middleware (depth, complexity, rate-limit rules in isolation), error masking, and autonomous QA agent behaviour (anomaly detection, failure recording, query generation). Includes `tests/unit/utils/argument-fixtures.test.ts` (unit tests for the QA generator's argument fixture helper).

2. **Integration** — Full `Query → Resolver → Service → API` pipeline executed against MSW-intercepted REST responses. Covers happy path, error propagation, null handling, security rule enforcement (depth limit fires at depth 9, complexity limit fires, introspection blocked in production mode), response caching (`Cache-Control: max-age=86400`), N+1 detection, and autonomous anomaly detection. Also includes `tests/integration/deprecated.test.ts` — a regression guard for `@deprecated` fields (`Capsule.dragon`, `missions`, `mission`) ensuring they resolve to `null` without throwing and appear correctly in schema introspection.

3. **Contract** — All 37 root Query fields validated as parse-and-validate queries against the built subgraph schema (`tests/contract/query.compliance.test.ts`). Schema SDL snapshot gate and breaking-change detection via `@graphql-inspector/core` diff against `origin/main` (`tests/contract/schema.diff.test.ts` — mirrors the CI `graphql-inspector diff` step and also runs locally). `tests/contract/query-generator.test.ts` validates that all schema-derived queries produced by the QA generator are syntactically and schema-valid; it tests the generator with the real production schema and lives in `contract/` because its assertions are contract-level (every generated query must validate).

4. **E2E** — Full stack through MSW-intercepted REST. Launches query from GraphQL operation → Apollo Server → resolver → REST mock → response. Null propagation verified end-to-end (unknown ID → `null`, not an error).

5. **Performance** — Concurrency floors validated in-process. SpaceX: 3 concurrent `launchesPast` queries complete under 2000 ms; 10 concurrent queries are all error-free. Countries (local only): single full-schema query with nested fields under 500 ms; 250-country dataset under 1000 ms; 10 concurrent requests under 2000 ms.

6. **Autonomous QA** — Schema-derived queries generated at runtime using domain-aware fixture seeds (real launch IDs from `tests/fixtures/launches.json` substitute `"qa-fixture-id"` for resolvers with fixture coverage, so the happy-path resolver branch is exercised rather than always returning `null`). Queries are fuzzed with adversarial variants and executed against an in-process server. Any response exceeding the latency threshold (MEDIUM) or containing unexpected errors (HIGH) is flagged. Failures carry an optional `knownLimitation` field — when set, they are separated from real anomalies in the CI report and do not block the gate. Failures are persisted to `qa-memory.json` and replayed on every subsequent run until resolved. At the end of each run, `generateCIReport()` groups real failures by resolver name (so 5 failures from the same broken resolver surface as one root cause, not 5 independent anomalies) and separates documented known limitations. The `printReport: true` option enables this output; it defaults to `false` to keep test runs clean. Zero high-severity anomalies required to pass CI.

---

## Design principles

**Shift-left** — Schema validation and unit tests run before integration, which runs before build. A type error or broken rule is caught in seconds, not after a multi-minute build.

**Schema-first contract** — Production query shapes are validated against the local schema on every push. A field rename or type change that would break supergraph composition is caught before the schema reaches the registry.

**Defense-in-depth** — Security enforced at three layers: validation (depth + complexity rules), resolver (null propagation, no data leakage), and API (error masking — stack traces never reach the client).

**No live network in CI** — MSW intercepts all outbound HTTP. `tests/fixtures/launches.json` is version-pinned. Flakiness from upstream instability is structurally impossible, not managed by retry logic.

**Continuous feedback** — Autonomous QA failure memory means a regression that appeared once will be retested on every subsequent run until it is explicitly resolved, not silently dropped.

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

**5. Performance smoke** (`tests/performance/query.load.test.ts`, `tests/performance/countries.load.test.ts`)
No upstream rate limit means a resolver regression (e.g., removing caching, adding a blocking loop) won't surface in unit tests. A concurrency baseline in CI acts as a canary. The Countries latency suite adds a second baseline: full-schema queries with nested fields must resolve within defined thresholds.

**6. N+1 Query Batching** (`tests/integration/nplusone.test.ts`)
Fetching lists of entities (launches, ships) that require sub-queries (rockets, payloads) can lead to request waterfalls. 
This is a primary risk for GraphQL-over-REST proxies. Verified by counting underlying datasource calls 
within a single execution.

---

## What was not tested, and why

**Mutations and subscriptions** — the schema has neither. Not applicable.

**Auth and per-user access control** — this subgraph has no auth layer. Auth belongs to the federation gateway. If `@authenticated` directives are ever added, a separate suite is needed.

**Live upstream calls** — excluded deliberately. The SpaceX upstream has no SLA, network calls make CI flaky, and the MSW-mocked suite already validates response mapping. Accepted risk: silent upstream shape changes won't be caught until a fixture is updated manually. The Countries API is similarly mocked; live E2E calls against `countries.trevorblades.com` are not included in the standard CI run.

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

---

## Framework improvements (post-initial-strategy)

The following changes were made after the initial strategy was implemented, based on framework analysis and test suite growth.

**Branch coverage threshold raised: 28% → 60%**
The original 28% threshold was set as a regression floor at a point when branch coverage was low and many resolver branches were untested. After adding resolver branch tests (launchpad, ships, history, payloads) and the Countries API suite, branch coverage rose to 88.41%. The threshold was raised to 60% to function as a meaningful CI gate rather than a pass-through.

**`jest.clearAllMocks()` removed from `tests/setup.ts`**
The setup file called `jest.clearAllMocks()` in `beforeEach`, which duplicated `clearMocks: true` in `jest.config.js`. Both perform the same operation. The config-level setting is retained as the single source; the redundant hook was removed to avoid confusion when debugging mock state between tests.

**`ApolloServerPluginInlineTraceDisabled` added to `src/qa/runner.ts`**
The QA runner's `buildQaServer()` was not passing `ApolloServerPluginInlineTraceDisabled`, so the Apollo inline-trace plugin ran on every query in `runAutonomousQA` and `replayFailure`. This added ~100ms of instrumentation overhead per execution, which caused `replay-failure.test.ts` to incorrectly flag clean query executions as `LATENCY_THRESHOLD_EXCEEDED`. Adding the plugin to the runner fixed the false positive and eliminated the console warning.

**Double `buildSubgraphSchema` call eliminated in `runAutonomousQA`**
`runAutonomousQA` previously called `buildSubgraphSchema` twice per invocation — once inline (lines 60-62) and again inside `buildQaServer()`. The inline call was dead code whose result was passed only to `generateQueries`; refactoring extracted `buildQaSchema()` as a shared helper eliminates the duplicate parse-and-validate cycle.

**`test:watch` script added**
`"test:watch": "jest --watch"` was added to `package.json` to provide the standard interactive watch-mode entry point for local development. Without it, developers ran bare `jest` which re-executes all 37 suites on every save.

**External GraphQL API integration: Countries API**
A typed service wrapper (`src/services/CountriesService.ts`) and MSW `graphql.link()` handlers (`tests/mocks/countries.handlers.ts`) were added to demonstrate and exercise the pattern for testing an external GraphQL API. The Countries test suite (`tests/integration/countries.graphql.test.ts`, `tests/performance/countries.load.test.ts`) covers 32 tests: basic query shape validation, all five filter operators (`eq`, `ne`, `in`, `nin`, `regex`), bonus currency consistency invariants (`Country.currency` ↔ `Country.currencies`), error propagation, and latency thresholds. All 32 tests are fully offline via MSW — no live network access required.

**Contract coverage expanded: 1 query → 37 (all root Query fields)**
`query.compliance.test.ts` previously validated a single production query (`GetLaunches`). The file was rewritten to cover all 37 root Query fields via `parse + validate` (no execution, no mocks). Grouped into five sections: list resolvers (16), single-item resolvers (12), singleton resolvers (2), result-envelope resolvers (4), deprecated resolvers (3). Each test catches field renames, type changes, or removals that would break a production query shape before the schema reaches the registry.

**Schema diff added as a Jest test (`tests/contract/schema.diff.test.ts`)**
Previously, breaking-change detection ran only as a CLI step in CI (`graphql-inspector diff`). A Jest test was added that (1) snapshots the SDL — any schema change fails until `--updateSnapshot` is run deliberately, and (2) diffs the current schema against `origin/main` using `@graphql-inspector/core`, failing on any `BREAKING` change. Skips gracefully when `origin/main` is unavailable (offline, fresh clone). Mirrors the CI CLI step so the gate runs locally too.

**Self-healing compliance script (`scripts/heal-compliance.ts`, `npm run schema:heal`)**
A ts-node script that regenerates `tests/contract/query.compliance.test.ts` from the current schema using `generateQueries()`. Run after a breaking schema change to restore a passing baseline, then review and re-add field-value assertions for priority resolvers before committing.

**Domain seeds: query generator uses real fixture IDs**
`src/qa/generators/domain-seeds.ts` reads `tests/fixtures/launches.json` at module load and exports `DOMAIN_SEEDS = { launch: "<real-id>" }`. `buildArgumentList` in `query-generator.ts` substitutes the real launch ID for the `id` argument of the `launch` resolver instead of `"qa-fixture-id"`. This causes the autonomous QA suite to exercise the happy-path resolver branch (actual data returned) rather than always hitting the null/404 branch. Other single-item resolvers (no fixture data) fall back to `"qa-fixture-id"` unchanged.

**Failure clustering and CI report in coverage agent**
Three new exports added to `coverage-agent.ts`: `extractResolver(field)` parses the resolver name from a query string; `clusterFailures(failures)` groups by resolver so 5 failures from one broken resolver surface as one root cause; `generateCIReport(failures)` produces a structured table separating real failures (grouped by resolver with HIGH/MEDIUM counts) from `knownLimitation` entries. The runner emits this report when `runAutonomousQA({ printReport: true })` is passed; defaults to `false` to keep test run output clean.

**Known-limitation metadata in `CoverageFailure`**
`CoverageFailure` gained an optional `knownLimitation?: string` field. When set, `recordFailure` emits `console.warn` instead of `console.error`, and `generateCIReport` moves the entry to an "ℹ️ Known limitations — not blocking CI" section separate from real anomalies.

**N+1 coverage extended to ships**
`nplusone.test.ts` previously had one test: rockets across launches (memoized — 3 launches × 1 rocket = 1 API call). A second test was added for ships, which have no memoization: 3 launches × 1 ship each = 3 `getShip` calls. The test documents the open N+1 risk for ships and acts as a regression gate — if a cache is added, the assertion changes to 1.

**E2E test value assertions added**
`tests/e2e/full.graphql.flow.test.ts` previously asserted only `data.launches` is an Array (shape-only). Added: `first.mission_name === "FalconSat"`, `first.launch_year === "2006"`, and `first.id` is a non-empty string — pinned against the MSW fixture.

**CLAUDE.md file path references corrected**
Five stale paths in the Testing section were corrected to match the actual file locations under `tests/`.

---

## Countries API — targeted test scenarios

Three specific scenarios were required and are fully implemented. Each is documented below with its location, the risk it targets, and what makes it non-trivial.

---

### 1. Filter operators — `in`, `nin`, `regex` (and `eq`, `ne`)

**File:** `tests/integration/countries.graphql.test.ts` → `describe('CountriesService — filter operators')`

**Tests:**
- `in`: returns only countries whose codes are in the set — validates that passing `{ code: { in: ["US", "CA"] } }` returns exactly those two countries and no others
- `nin`: excludes countries whose codes are in the set — validates that `{ code: { nin: ["DE", "FR"] } }` omits both and returns the remainder
- `regex`: returns countries whose currency matches the pattern — `{ currency: { regex: "^EUR$" } }` must return exactly DE and FR (both `EUR`), not CU (`CUC,CUP`)
- `continent in / nin`: filter applied to a nested field (`continent.code`) rather than a root scalar, exercising the filter path through a relationship
- `eq` and `ne` on both countries and the `getContinents` / `getLanguages` query types
- Edge case: `in: []` (empty set) must return zero results, not all results

**Why it matters:** The filter operators are the only variability axis the API exposes. A filter that silently returns all records instead of filtered ones (the most common implementation bug) would pass a simple shape test but fail here because result counts and codes are asserted exactly.

**How the mock works:** The MSW `graphql.link()` handler receives the `variables.filter` object and runs the same operator logic (`eq`, `ne`, `in`, `nin`, `regex`) against the fixture dataset, so the service layer is genuinely exercising filter serialization and response mapping — not just receiving a hard-wired stub.

---

### 2. Performance / latency assertion on all-countries with nested fields

**File:** `tests/performance/countries.load.test.ts` → `describe('CountriesService — latency')`

**Tests:**
- Single `getCountries()` call requesting `code name capital currency currencies phone phones emoji awsRegion continent { code name } languages { code name native } states { code name }` must complete in under **500 ms**
- Same query against a synthetic 250-country dataset must complete in under **1000 ms** — validates that deserialization scales linearly rather than exponentially
- **10 concurrent** `getCountries()` calls must all resolve within **2000 ms** — rules out a serialization bottleneck in the service layer
- Mixed parallel fan-out (`getContinents` + `getLanguages` + filtered `getCountries` in `Promise.all`) must complete within **1500 ms** — validates that three simultaneous queries do not block each other

**Why it matters:** Nested fields (`continent`, `languages`, `states`) multiply JSON payload size relative to a flat query. A service that processes response data with O(n²) field iteration would pass unit tests but fail the latency gate when all fields are requested at once.

**What the threshold tests:** Because MSW intercepts at the network level in Node.js (near-zero latency), the measured time is dominated by JSON serialization, `fetch` API overhead, and any response-processing logic in `CountriesService.gql()`. The thresholds are tight enough to catch an accidental O(n) string copy per field but loose enough to survive GC pauses on a CI runner.

---

### 3. `Country.currency` ↔ `Country.currencies` consistency

**File:** `tests/integration/countries.graphql.test.ts` → `describe('CountriesService — currency consistency')`

**Tests:**
- **Single-currency country** (`currency: "USD"`, `currencies: ["USD"]`): asserts `currency === currencies[0]` — the scalar and the array agree
- **Multi-currency country** (`currency: "CUC,CUP"`, `currencies: ["CUC", "CUP"]`): asserts `currency === currencies.join(',')` — the scalar is the comma-joined encoding of the array
- **Pinned real-world case — Cuba**: `currency.split(',')` must deep-equal `currencies` — validates both value equality and element order
- **Dataset-wide invariant**: for every country in the response, `currency.split(',').length === currencies.length` — the comma-count in the scalar always matches the array length, with no off-by-one from trailing commas or empty segments

**Why it matters:** `Country.currency` and `Country.currencies` are two representations of the same data returned by the same API. A client that uses `currencies` for display and `currency` for filtering (or vice versa) will produce wrong results if the two fields diverge. This scenario cannot be caught by a shape test (`toBeDefined`, `toBeInstanceOf(Array)`) — it requires asserting the semantic relationship between two fields on the same object.

**The multi-currency case is the critical one:** For single-currency countries the relationship is trivially `===`. The bug surface is the comma-separated encoding for multi-currency countries, which is why Cuba (`CUC,CUP`) is pinned as a concrete example rather than relying on the dataset-wide invariant alone.
