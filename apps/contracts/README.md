# Junkyard Arcade Contracts

This package contains the Solidity protocol contracts for Junkyard Arcade, built with Foundry.

## Scope

The contract system covers:

- factory deployment and series creation
- per-series purchase, open, and claim logic
- blind box NFT issuance and burn-on-claim flow
- prize pool funding with ERC20, ERC721, and ERC1155 assets
- config and buy guards
- Chainlink VRF-backed randomness provider
- global whitelist and implementation configuration

## Main components

Core contracts live under `src/core/`:

- `JunkyardFactory.sol`
- `JunkyardGlobalConfig.sol`
- `JunkyardSeries.sol`
- `JunkyardNFT.sol`
- `JunkyardPrizePool.sol`

Support modules:

- `src/guards/config/OwnerConfigGuard.sol`
- `src/guards/buy/OpenBuyGuard.sol`
- `src/oracles/ChainlinkVRFProvider.sol`
- interfaces in `src/interfaces/`

## Tooling

- Foundry
- Solidity `0.8.25`
- EVM target: `cancun`
- optimizer enabled
- `via_ir = true`

Configuration lives in [foundry.toml](./foundry.toml).

## Environment

Copy `.env.example` and provide at least:

- `PRIVATE_KEY`
- `BASE_SEPOLIA_RPC_URL`
- optional ownership and fee overrides such as `DEPLOY_OWNER` and `FEE_RECIPIENT`

The current deployment script is focused on Base Sepolia.

## Common commands

Build:

```bash
pnpm --filter @junkyard-arcade/contracts build
```

Test:

```bash
pnpm --filter @junkyard-arcade/contracts test
```

Format check:

```bash
pnpm --filter @junkyard-arcade/contracts lint
```

Format:

```bash
pnpm --filter @junkyard-arcade/contracts fmt
```

You can also run Foundry directly inside this package:

```bash
forge build
forge test
forge fmt
```

## Deployment

The main deployment script is:

- [DeployBaseSepolia.s.sol](./script/DeployBaseSepolia.s.sol)

It deploys:

- config and buy guards
- a Chainlink VRF provider
- implementation contracts for series, NFT, and prize pool
- global config
- factory

It also writes the resulting addresses to:

- [deployments/base-sepolia.json](./deployments/base-sepolia.json)

Example:

```bash
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

## Testing guidance

The suite includes unit, integration, and security-oriented tests. Run the tests before:

- changing purchase/open/claim logic
- changing prize pool accounting
- changing whitelist behavior
- changing oracle integration or randomness assumptions

If ABI surfaces change, rebuild before updating the subgraph or frontend.

## Notes for downstream modules

- The subgraph reads ABIs from `out/`.
- The frontend depends on deployed addresses and ABI compatibility.
- Oracle fee behavior can vary with network conditions, so UI code should avoid assuming a fixed request price.

## Safety note

These contracts should be treated as development-stage protocol code unless you have completed your own review, testing, threat modeling, and independent security audit.
