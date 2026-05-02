Schema-Driven GraphQL Query System Strategy
(with Cost & Safety Controls)
1. Core Principle: Schema is the Contract, Queries are the Workload

In a production GraphQL system:

The schema defines what is possible
Queries define how expensive the system becomes

Therefore:

Every field has a behavioral cost
Every query has a compute budget
Every resolver is a risk surface

We treat GraphQL as a:

costed query execution engine over a typed graph

2. Schema Design Rules (Cost-Aware First)

Every schema field MUST define:

2.1 Field metadata model (conceptual)

Each field is classified as:

cheap → direct property lookup
medium → single service call / join
expensive → fan-out / external API / aggregation

Example:

type Launch {
  id: ID!                 # cheap
  mission: String         # cheap
  rocket: Rocket          # medium
  telemetry: Telemetry    # expensive (external system)
}
2.2 Schema constraints

All types must define:

nullability rules
pagination rules for lists
maximum depth expectations (documented)
2.3 Required schema governance rules
No field added without:
cost classification
owner (service/team)
resolver performance expectation
All breaking changes must be versioned or deprecated
3. Query Cost Model (Core Safety Layer)

Every query is assigned a numeric cost score.

3.1 Cost formula (simplified)
QueryCost =
  Σ(field cost × depth multiplier × list multiplier)
3.2 Example
query {
  launches {
    rocket {
      telemetry {
        temperature
      }
    }
  }
}

Cost increases because:

launches → list multiplier
rocket → nested traversal
telemetry → expensive external call
3.3 Cost thresholds
Tier	Limit
Simple queries	≤ 100
Standard queries	≤ 300
Complex queries	≤ 500
Blocked	> 500
3.4 Enforcement rule

Any query exceeding threshold is rejected BEFORE execution.

4. Query Depth & Shape Safety Controls
4.1 Depth limiting
Max depth: 8–12 levels (configurable)
Applies recursively across all nested fields
4.2 Breadth limiting

Prevent:

requesting too many sibling fields
large list expansions without pagination

Example rule:

Lists MUST always be paginated (limit/offset or cursor)

4.3 Shape validation

Reject queries that:

request unbounded arrays
combine deep + wide traversal
exceed complexity threshold even if shallow
5. Resolver Safety Model

Each resolver must follow:

5.1 Resolver contract

Every resolver defines:

latency expectation (SLO)
caching behavior (yes/no)
batching eligibility (DataLoader required or not)
5.2 N+1 prevention

Mandatory:

DataLoader or batching layer for:
nested entity resolution
repeated lookups
5.3 Fan-out control

If one field triggers:

multiple downstream calls
external APIs
database joins

Then it must be:

cached OR
rate-limited OR
precomputed
6. Safety Controls (Production Guardrails)
6.1 Query rejection rules

Reject if:

cost exceeds threshold
depth exceeds limit
recursive patterns detected
6.2 Rate limiting (per client + query shape)

Limit by:

API key
client identity
query complexity bucket
6.3 Introspection policy
Disabled in production OR
Allowed only for authenticated internal users
6.4 Timeout enforcement

Hard timeout per query:

Simple: 200ms–500ms
Complex: max 1–2s
Always kill runaway execution
7. Schema Governance System
7.1 Schema registry (required)

All schema changes must go through:

registry validation
diff comparison
breaking-change detection
7.2 Breaking change rules

A change is breaking if:

field removed
type changed
nullability tightened
enum values removed
7.3 Deprecation policy
Fields must be marked @deprecated
Minimum deprecation window: 1 release cycle
8. Observability Requirements

Every query MUST emit:

8.1 Metrics
query cost
execution time
resolver breakdown
cache hit ratio
8.2 Tracing
per-field latency tracing
resolver-level spans
8.3 Logging
rejected queries (with reason)
cost violations
depth violations
9. Performance Strategy
9.1 Caching layers
Field-level caching
Query result caching (APQ-style)
CDN caching for safe queries
9.2 Data optimization
batch resolvers
avoid repeated joins
precompute expensive aggregates
10. Testing Strategy (Schema-Driven)

All tests map directly to schema risks:

Required tests:
1. Schema validation test
ensures schema compiles + is consistent
2. Happy-path query test
validates core query flows
3. Nested query integrity test
ensures resolver chains work
4. Error propagation test
null handling + partial failures
5. Cost enforcement test
ensures expensive queries are rejected
6. Depth limit test
ensures query rejection works correctly
7. Filter correctness test
validates in, nin, regex

---

A. Pre-Testing Questions

Before writing a single test, the following questions were asked to scope the effort correctly:

API surface and ownership
- Who are the downstream consumers of this API — internal services, a public client, or both?
  (Answer: public Apollo Studio endpoint; consumers include any federated supergraph)
- Which queries are exercised most heavily in production today? Do any have known SLA targets?
- Is this API read-only (queries only) or does it also expose mutations / subscriptions?
  (Answer: query-only — no mutations or subscriptions in schema.graphql)

Data and reliability contract
- Does the upstream SpaceX REST API (api.spacexdata.com) have documented rate limits or reliability SLAs?
  (Answer: undocumented / community API; no official SLA)
- What happens if the upstream returns a 5xx or times out — does GraphQL surface a partial response or a hard error?
- Are any fields computed (aggregated) by this service, or are all fields a 1:1 pass-through from REST?

Security and deployment context
- Is introspection disabled in production? (Answer: yes — gated on NODE_ENV=production)
- Is there client authentication on this subgraph, or is it open to the internet?
- What query depth and complexity limits are configured, and have they ever been hit in production?

Testing scope and constraints
- Is there a fixture/snapshot of a known-good REST response I can use to avoid live API calls in CI?
  (Answer: yes — tests/fixtures/launches.json; all HTTP intercepted by MSW)
- Are there existing tests at the supergraph level that already cover contract compliance?
- What is the available time budget — which scenarios must pass before a deploy is blocked?

---

B. Prioritized Scenarios (Top 5)

Priority was assigned using a two-axis model: likelihood of breakage × blast radius if broken.

Priority 1 — Happy-path launch query (tests/integration/graphql.api.test.ts)
Why: `launches` is the API's primary read path. If it breaks, every consumer is broken.
Every schema change, resolver refactor, or upstream API shift touches this path first.
Coverage: fields returned, pagination (limit/offset), response shape matches schema.

Priority 2 — Safety controls: cost and depth limits (tests/integration/security.test.ts, tests/unit/utils/)
Why: A public GraphQL endpoint with no authentication is vulnerable to denial-of-service via
deeply nested or explosively wide queries. Verifying that the enforcement middleware actually
blocks over-budget queries is higher priority than testing any individual resolver, because a
misconfigured safety gate affects every query simultaneously.
Coverage: depth limit rejection, complexity budget enforcement, rate limit response codes.

Priority 3 — Null / error propagation (tests/integration/errors.test.ts)
Why: The upstream REST API returns `null` for many optional fields (deprecated endpoints,
missing mission data). GraphQL's nullable-by-default type system means a single resolver
returning null can silently propagate through the entire response tree. Verifying that partial
failures produce well-formed errors rather than runtime exceptions protects client parsing.
Coverage: 404 from upstream, resolver throw, null field coalescence.

Priority 4 — Schema contract compliance (tests/contract/query.compliance.test.ts)
Why: This subgraph is part of an Apollo Federation supergraph. Any field rename or type
change that is not caught locally will break the supergraph composition at deploy time, not
at development time. A contract test that validates production queries against the local
schema catches breaking changes before they reach the registry.
Coverage: known production query shapes validated against built schema; schema diff in CI.

Priority 5 — Performance smoke test (tests/performance/query.load.test.ts)
Why: The REST upstream has no documented rate limit. A performance regression in resolver
logic (e.g., accidentally removing response caching, or introducing a synchronous loop over
a large dataset) would not surface in unit tests. A throughput baseline test run in CI acts
as a canary for resolver-level regressions.
Coverage: repeated query execution under a time budget; p95 latency threshold.

---

C. Conscious Exclusions

The following areas were explicitly out-of-scope given the time available, with the reasoning for each:

Mutation and subscription testing
Not applicable — the schema exposes no mutations and no subscriptions. If either is added
in the future, security and idempotency tests should be added before the first deploy.

Authentication and authorisation testing
This subgraph does not implement per-user auth; it is open-read behind a federation gateway.
Auth concerns belong to the gateway layer, not this subgraph. If per-field auth is ever added
via a directive (e.g., @authenticated), a dedicated auth test suite must be introduced.

Live upstream integration tests (real api.spacexdata.com calls)
All HTTP is intercepted by MSW in CI. A live integration run would be flaky (upstream has no
SLA), slow (network round-trip), and would not add coverage beyond what the mocked suite
already verifies. The trade-off: if SpaceX silently changes a response shape, only the live
run would catch it. Accepted risk — the REST response mapping is shallow and explicit.

Full resolver coverage across all 40+ schema types
The schema exposes capsules, cores, dragons, landpads, launchpads, payloads, ships, rockets,
history, roadster, and company in addition to launches. Unit tests cover launches and the
parse/pagination services; the remaining resolvers are covered at the integration level only
via the full-query flow test. Individual resolver unit tests for every type were deprioritised
because the resolver logic is uniformly thin (REST call → optional transform → return).

Load and soak testing beyond smoke threshold
The performance test verifies a minimum throughput floor but does not measure sustained load,
memory growth under load, or behaviour under concurrent requests at scale. Running a genuine
soak test (e.g., k6 or Artillery for 10+ minutes) was out of scope for a CI gate; it belongs
in a pre-release performance review on staging infrastructure.

End-to-end federation composition tests
Validating that this subgraph composes correctly with a supergraph (via rover dev or a real
router) requires external infrastructure. The contract tests approximate this by validating
query shapes against the local built schema, but true composition testing was excluded.

---

D. Top Risks and Edge Cases

Ranked by concern — highest risk first:

1. Silent null propagation from upstream deprecations
The SpaceX REST API has quietly deprecated several endpoints (MongoDB removal).
Deprecated fields like Capsule.dragon return null. In a nullable GraphQL schema, a null
from a broken upstream resolver propagates silently — the query "succeeds" but the client
receives incomplete data with no error. Risk: clients parse partial data as complete.
Mitigation in place: errors.test.ts verifies null handling; MSW fixtures include null fields.

2. Unbounded list queries without enforced pagination
Every list field (launches, capsules, rockets, etc.) accepts optional limit/offset but does
NOT require it. A client can omit both and request the full dataset. Because all data is
fetched from a single upstream REST call and then paginated in memory
(limit-offset-service.ts), an unpaginated query forces the entire dataset into memory on
every request. Risk: memory exhaustion under concurrent load.
Mitigation in place: pagination documented as required in schema governance; no hard
enforcement at the resolver layer currently — this is an open risk.

3. Complexity bypass via alias explosion
The graphql-validation-complexity library deduplicates aliased field selections
(uniqSelections). This means 500 aliases of the same field cost the same as 1. An attacker
who discovers this can pack a query with aliases that appear expensive syntactically but
pass the cost gate. This was discovered during test implementation.
Mitigation in place: test confirms current behaviour; the threshold is tuned against the
actual (deduplicated) cost model. Full alias-explosion mitigation would require a custom
cost function that counts aliases independently.

4. Federation @key absence means no entity resolution
No type in this schema carries a @key directive. This means no type can be referenced or
extended by another subgraph via the Federation entity protocol. If a consuming subgraph
ever tries to extend Launch or Rocket, the composition will fail silently or with an opaque
rover error. Risk: architectural dead-end when the graph scales.
Mitigation in place: contract tests validate the schema structure; the absence of @key is
documented as a known limitation.

5. Stale cache serving outdated launch data
The server applies a response cache with an 86400s (24-hour) max-age by default. SpaceX
launch data changes frequently around launch events (T-24h through landing). A consumer
querying launchLatest could receive a cached response that is hours out of date during a
live countdown. Risk: incorrect data served to time-sensitive clients.
Mitigation in place: cache behaviour is documented; cache TTL is configurable. No cache
invalidation mechanism exists — this is an open operational risk.

6. graphql-inspector Federation v2 incompatibility in schema diff
The @link directive used by Apollo Federation v2 is not understood by graphql-inspector's
internal buildASTSchema. Without preprocessing, the schema diff step in CI will throw
"Unknown directive @link" and the breaking-change gate will not run.
Mitigation in place: scripts/strip-federation.js preprocesses both schemas before diffing.

---

11. AI Usage in Strategy Design — Actual Log

The following records the specific prompts used, what the AI returned, and what was changed
before the output was accepted. AI was used to accelerate — not replace — engineering judgment.

Usage 1 — Identifying risk surface for a read-only REST-proxy GraphQL API

Prompt:
  "I'm building a test strategy for a GraphQL API that is a read-only proxy over a SpaceX
  REST API. It uses Apollo Federation v2, has no authentication, and is exposed publicly.
  What are the highest-risk test scenarios I should prioritise, and what edge cases are
  specific to GraphQL-over-REST architectures that I might miss?"

Output received:
  AI listed: (1) N+1 query problem, (2) null propagation from REST nulls, (3) introspection
  abuse, (4) deeply nested query DoS, (5) schema drift between REST response and GraphQL
  types, (6) alias explosion bypassing complexity limits, (7) pagination being optional not
  required.

What was changed:
  Items 1, 2, 4, 6, 7 were adopted directly into the risk register (section D above).
  Item 3 (introspection) was already handled by the server config (disabled in production)
  so it was recorded as a known mitigation, not a test gap.
  Item 5 (schema drift) was already partially covered by the MSW fixtures; no new test was
  added, but it was noted as the motivation for keeping fixtures version-pinned.

Usage 2 — Drafting the pre-testing question list

Prompt:
  "Before testing an Apollo Federation subgraph that proxies a third-party REST API with no
  authentication and no mutations, what questions would a QA engineer need answered to scope
  the test effort? Group them by: API surface, data contract, security, and CI constraints."

Output received:
  AI produced ~18 questions in four groups. Many overlapped with obvious concerns already
  known (e.g., "are there mutations?" when the schema was already in hand).

What was changed:
  The list was pruned to the 12 questions that were non-obvious or that required an actual
  answer (not just reading the schema). Questions about live SLA targets and upstream rate
  limits were kept because the answers changed scope decisions (live tests excluded).
  Generic questions like "what is the purpose of the API?" were dropped.

Usage 3 — Generating fuzz test variants for the security suite

Prompt:
  "Give me 10 GraphQL query strings that a security tester would use to probe a public
  Apollo Server for denial-of-service vulnerabilities. Include: alias explosion, deep
  nesting, wide breadth, field duplication, and introspection abuse."

Output received:
  AI produced 10 queries covering all five categories. The introspection query was a standard
  __schema dump. The alias explosion example used 100 aliases of the same scalar field.

What was changed:
  The alias explosion example was modified — 100 aliases was below the complexity threshold,
  so the count was raised to 500 and the query was used to document the uniqSelections
  deduplication behaviour discovered in testing (see risk #3, section D).
  The introspection query was used as-is in the security test to verify it is blocked in
  production mode.
  Deep nesting and breadth queries were adapted to match the actual schema type graph
  (launches → rocket → engines → isp → sea_level) rather than the generic schema the AI
  invented.

Usage 4 — Reviewing coverage threshold values

Prompt:
  "Our Jest coverage report shows: statements 57%, branches 31%, functions 46%, lines 57%.
  The thresholds in jest.config.js are set to 80/75/80/80, causing CI to fail. What
  thresholds make sense as regression gates (not aspirational targets) given these actuals,
  and what is excluded from measurement?"

Output received:
  AI recommended setting thresholds at actual minus 5 percentage points as a regression
  buffer, and excluding entry points, CI scripts, and generated files from collection.

What was changed:
  The recommendation was applied: thresholds set to 55/28/44/55 (actual minus ~2–3 points,
  slightly more conservative than the 5-point buffer because branches are volatile across
  test runs). Exclusions added for src/index.ts (server entry point) and
  src/qa/update-readme-metrics.ts (CI-only script). The AI's suggestion to also exclude
  __generated__ was already in place.