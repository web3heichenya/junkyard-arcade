<p align="center">
  <img src="apps/web/public/logo.png" width="128" height="128" alt="Logo" />
</p>

# Junkyard Arcade

Junkyard Arcade is a full-stack onchain blind box project built around verifiable randomness, multi-asset prize pools, and a creator-facing operations console.

The repository is organized as a pnpm + Turbo monorepo:

- `apps/web`: Next.js application for creators and collectors
- `apps/contracts`: Solidity protocol contracts built with Foundry
- `apps/subgraph`: The Graph subgraph for indexed reads and analytics

## What the project does

Junkyard Arcade lets a creator:

- deploy a blind box series with fixed sale parameters
- configure whitelist-backed reward assets
- fund a prize pool with ERC20, ERC721, and ERC1155 assets
- manage leftover handling after the sale ends

Collectors can:

- buy a blind box NFT
- open it by requesting randomness from Chainlink VRF
- claim the final reward after randomness is fulfilled

## Current scope

The current implementation is intentionally narrow:

- Base Sepolia is the primary supported network
- the UI is optimized around preset addresses and a constrained creator flow
- indexed reads come from the subgraph, while some interaction states are refined with direct onchain reads

## Architecture

```text
web app -> wagmi / viem -> protocol contracts
       -> GraphQL -> subgraph

factory -> series + nft + prize pool
series  -> purchase / open / claim
oracle  -> Chainlink VRF-backed randomness
subgraph -> searchable series, boxes, assets, and reward distributions
```

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run the web app

```bash
pnpm dev
```

### 3. Build the monorepo

```bash
pnpm build
```

### 4. Run tests

```bash
pnpm test
```

## Workspace commands

From the repository root:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm codegen
```

Useful targeted commands:

```bash
pnpm --dir apps/web dev
pnpm --dir apps/web build
pnpm --dir apps/contracts test
pnpm --dir apps/subgraph build
```

## Repository layout

```text
.
├── apps
│   ├── contracts
│   ├── subgraph
│   └── web
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development notes

- Contract deployments are currently written to `apps/contracts/deployments/`.
- The subgraph expects compiled contract ABIs from `apps/contracts/out/`.
- The web app reads subgraph data for series, blind boxes, and reward history.
- Some UX states intentionally use direct chain reads to avoid waiting on indexer lag.

## Disclaimer

This repository is provided for research, prototyping, and educational purposes.

- The contracts and application have not been presented here as production-audited software.
- Do not assume the system is safe for mainnet value, treasury assets, or public launch in its current form.
- Blockchain interactions are irreversible and may fail because of RPC issues, oracle latency, indexing delay, contract bugs, or configuration mistakes.
- Nothing in this repository is financial advice, investment advice, legal advice, or security assurance.
- If you deploy or use this code, you do so at your own risk.

For module-specific setup and implementation notes, see:

- [apps/web/README.md](./apps/web/README.md)
- [apps/contracts/README.md](./apps/contracts/README.md)
- [apps/subgraph/README.md](./apps/subgraph/README.md)
