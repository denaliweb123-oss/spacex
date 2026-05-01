# SpaceX GraphQL API

![Discord](https://img.shields.io/discord/1022972389463687228?logo=discord&logoColor=white&color=blue&style=flat&label=Discord)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/WdJd2w?referralCode=xsbY2R)

This graph is a recreation of the [SpaceXLand/api](https://github.com/SpaceXLand/api) project that was authored by [Carlos Rufo](https://github.com/itscarlosrufo). The code for this recreation is open source and can be viewed [here](https://github.com/apollographql/spacex).

The original project used a MongoDB that was deprecated in favor of Launch Library 2; you can read about the issue [here](https://github.com/r-spacex/SpaceX-API/issues/1243). The team plans to keep the REST API in place but unmaintained. This project utilized the REST API to implement the same schema, but there are some gaps that have been marked `@deprecated`. For example, `Missions` are not available in the REST API.

You can try querying this graph using [Explorer](https://studio.apollographql.com/public/SpaceX-pxxbxen/explorer?variant=current).

## What this graph is all about

Open Source GraphQL API for launch, rocket, core, capsule, starlink, launchpad, and landing pad data possibly by a community effort from [r-spacex](https://github.com/r-spacex/SpaceX-API).

This graph is meant for exploring historical SpaceX data. Any current space launch information can be found through [The Space Dev's Launch Library v2 (LLv2) effort](https://ll.thespacedevs.com/docs/). If you are interested in this effort, there are a couple ways you can get active in it:

1. Join [The Space Dev's Discord Server](https://discord.gg/p7ntkNA) to receive the latest updates
2. The Apollo DevRel team started up an [open sourced repository](https://github.com/apollographql/Space-Devs/issues) to create a GraphQL API for the LLv2. 
  a. You can query the data of this graph [here](https://studio.apollographql.com/public/space-devs/home?variant=main)
3. Join the [Apollo Discord Server](https://discord.gg/graphos) and we can help get you plugged in.

## Accessing this graph

🛰 You can send operations to this graph through its cloud router: https://main--SpaceX-pxxbxen.apollographos.net/graphql

## Quality Assurance & Testing

🧪 This project employs a multi-layered automated QE strategy to ensure schema stability and production readiness. We use a combination of standard testing tools and custom autonomous agents:

* **Jest:** Core unit and integration testing with `ts-jest`.
* **GraphQL Inspector:** SDL linting and breaking change detection against the production endpoint.
* **Autonomous QA:** A custom agentic framework (`src/qa/`) that derives queries from the live schema to detect performance anomalies and execution gaps.

Our automated suites provide coverage across several key dimensions:

1. **Schema Integrity:** Blocking breaking changes and ensuring SDL documentation standards.
2. **Security Hardening:** Validating depth limits, complexity thresholds, and introspection safety.
3. **Performance Monitoring:** Identifying N+1 query patterns and high-latency resolvers.
4. **Resilience:** Null-handling suites to ensure graceful degradation when upstream REST data is missing.

### Running Tests
```bash
npm test                        # Run all tests
npm test -- ai.qa.test.ts        # Run the autonomous QA suite
```
Detailed strategy documentation can be found in `docs/test-strategy.md`.

## Questions or Issues

If you have any questions or issues with this project, come find us on Discord to talak about it!

<a href="https://discord.gg/graphos"><img src="https://discord.com/api/guilds/1022972389463687228/widget.png?style=banner2"></a>