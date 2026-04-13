# Junkyard Arcade Subgraph

This package contains the Graph subgraph used to index Junkyard Arcade protocol activity.

It turns onchain events into queryable entities for the web application and any external analytics consumer.

## What it indexes

The subgraph tracks:

- series creation and configuration updates
- blind box purchases, opens, burns, and claims
- prize distributions
- prize pool funding and asset balance changes
- leftover sweeps
- aggregate platform and user statistics

## Network target

The checked-in manifest is currently configured for `base-sepolia`.

See:

- [subgraph.yaml](./subgraph.yaml)

If you deploy to a different network, update:

- network name
- source addresses
- start blocks
- ABI compatibility

## Core entities

Important entities defined in `schema.graphql`:

- `Global`
- `Series`
- `BlindBox`
- `User`
- `Asset`
- `AssetConfig`
- `AssetDeposit`
- `PrizeDistribution`
- `LeftoverTransfer`
- `Transaction`
- `DailyStats`

These power most of the app's read-side UX, including series discovery, ownership views, prize histories, and admin dashboards.

## Source mappings

Mappings are split by protocol surface:

- `src/factory.ts`
- `src/series.ts`
- `src/nft.ts`
- `src/prizepool.ts`

The manifest uses one factory data source plus dynamic templates for each created series, NFT, and prize pool.

## Prerequisites

- Node.js 18+
- pnpm
- Graph CLI

Install dependencies:

```bash
pnpm install
```

## Common commands

Generate types:

```bash
pnpm --filter @junkyard-arcade/subgraph codegen
```

Build the subgraph:

```bash
pnpm --filter @junkyard-arcade/subgraph build
```

Local Graph deployment helpers:

```bash
pnpm --filter @junkyard-arcade/subgraph create-local
pnpm --filter @junkyard-arcade/subgraph deploy-local
```

## Contract ABI dependency

This package depends on compiled ABI artifacts from the contracts workspace.

Before building the subgraph after contract changes:

```bash
pnpm --filter @junkyard-arcade/contracts build
pnpm --filter @junkyard-arcade/subgraph codegen
pnpm --filter @junkyard-arcade/subgraph build
```

If you change event signatures or contract output paths, update the manifest accordingly.

## Local development flow

Typical flow:

1. deploy contracts to a target network
2. update addresses and start blocks in `subgraph.yaml`
3. build contract artifacts
4. run subgraph codegen
5. build or deploy the subgraph

## Query usage

The web app relies on this package for:

- series lists and summary metrics
- per-series asset configurations
- blind box ownership history
- prize distribution records after claim
- aggregated user activity

One important implementation detail: the frontend may still perform direct onchain reads for latency-sensitive interaction states, because indexer freshness is not guaranteed at transaction time.

## Troubleshooting

If indexing looks wrong, verify the following first:

- contract addresses in `subgraph.yaml`
- `startBlock` values
- ABI paths into `../contracts/out/`
- event signatures in the manifest
- whether the target chain actually emitted the expected events

## Files to inspect first

- [schema.graphql](./schema.graphql)
- [subgraph.yaml](./subgraph.yaml)
- [src/series.ts](./src/series.ts)
- [src/prizepool.ts](./src/prizepool.ts)
