Test Strategy — SpaceX API (GraphQL-Readiness Perspective)
1) Questions asked before starting testing

Before designing the test suite, I focused on understanding both functional behavior and GraphQL readiness risks. The key questions were:

API understanding
What are the core data models (e.g., launches, rockets, missions, capsules)?
What relationships exist between entities (nested vs flat data)?
Which fields are most frequently queried by clients?
GraphQL readiness (even if API is REST today)
If this were converted to GraphQL, what would the schema look like?
Which entities would become root types vs nested types?
Where would resolver complexity likely emerge?
Data integrity & correctness
Are there inconsistencies in naming, formatting, or domain fields (e.g., dates, status)?
Are relationships always valid (e.g., launch ↔ rocket references)?
Reliability & performance
Which endpoints/queries are most expensive (large datasets like launches)?
How does the API behave under repeated or nested access patterns?
Failure behavior
What happens when invalid IDs or filters are used?
How does the system behave with missing or partial data?
2) Prioritized test scenarios (3–5) and rationale

Given limited time, I prioritized scenarios based on risk, user impact, and GraphQL future compatibility.

1. Core “happy-path” data retrieval

What: Fetch primary entities (e.g., launches, rockets, missions) with valid parameters
Why: This represents the most common user behavior and validates baseline correctness of the API.

2. Nested relationship integrity (GraphQL-equivalent concern)

What: Validate linked entities (e.g., launch → rocket → mission data consistency)
Why: In GraphQL, these become nested resolvers. This is where most real-world failures (nulls, broken joins) occur.

3. Error handling & invalid inputs

What: Invalid IDs, malformed queries, missing parameters
Why: Ensures predictable API behavior and validates resilience against bad client requests.

4. Data shape & type consistency

What: Validate response structure (required fields, types, nullability consistency)
Why: Critical for future GraphQL migration where strict schema contracts are enforced.

5. Filter / query behavior validation (if applicable)

What: Filtering launches by year, status, or attributes
Why: Filters often become GraphQL arguments (in, eq, etc.), and correctness here prevents future schema issues.

3) What was NOT tested (and why)

Given time constraints, I deliberately excluded the following:

1. Exhaustive endpoint coverage
❌ Not testing every single endpoint permutation
Why: Low marginal value; most share underlying patterns already validated by core scenarios.
2. Deep performance/load testing
❌ No large-scale stress or concurrency testing
Why: Requires dedicated infrastructure and is better handled in a separate performance testing phase.
3. Full combinatorial filter testing
❌ Not testing all possible filter combinations
Why: Exponential complexity with low additional insight beyond representative cases.
4. UI or frontend integration flows
❌ Not testing frontend behavior
Why: Out of scope; focus is API correctness and contract stability.
5. Rare or deprecated fields
❌ Legacy or low-usage attributes excluded
Why: Focus was placed on production-relevant and schema-stable fields.
4) Key risks & edge cases (GraphQL-focused perspective)

Even though the API is REST-based, I evaluated it through a GraphQL production lens:

1. N+1 query risk (future GraphQL concern)
Nested relationships could lead to inefficient resolver chains if converted to GraphQL.
2. Schema drift risk
Inconsistent field naming or structure could break clients if a GraphQL schema is introduced.
3. Null propagation issues
Missing nested entities may produce partial responses that are hard to reason about in a GraphQL model.
4. Data inconsistency across relationships
Example: launch references a rocket that is missing or mismatched.
5. Unbounded query complexity (future risk)
If converted to GraphQL, deeply nested queries could become expensive or abused without query depth limits.
6. Type instability
Inconsistent formatting (dates, enums, stringified arrays) could violate strict GraphQL schema types later.
5) Use of AI tools during strategy phase

AI tools were used as a supporting assistant for exploration, not decision authority.

What I prompted AI with:
“Identify likely API risk areas for a SpaceX-style dataset API”
“Suggest GraphQL test scenarios for nested space/launch data”
“List edge cases for REST → GraphQL migration testing strategy”
“What are common production GraphQL failure modes?”