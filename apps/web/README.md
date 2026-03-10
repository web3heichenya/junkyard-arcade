# Junkyard Arcade Web

This package contains the Next.js 15 App Router frontend for Junkyard Arcade.

It is the operator and collector interface for:

- browsing blind box series
- creating new series from preset network configuration
- funding and managing reward pools
- buying, opening, and claiming blind boxes
- reviewing owned boxes and reward outcomes

## Stack

- Next.js 15
- React 19
- Tailwind CSS v4
- shadcn/ui + Radix UI primitives
- wagmi + viem for wallet and contract interactions
- GraphQL reads against the subgraph

## Key routes

- `/[locale]`: home page
- `/[locale]/series`: discover all indexed series
- `/[locale]/series/[id]`: series detail, purchase, ownership, and admin actions
- `/[locale]/create`: creator flow for deploying a new series
- `/[locale]/me`: wallet-specific blind box inventory
- `/[locale]/docs`: project documentation

## Environment variables

Copy `.env.example` and fill in the required values.

Important variables:

- `NEXT_PUBLIC_SITE_URL`: canonical site URL
- `SUBGRAPH_URL`: server-side subgraph endpoint
- `NEXT_PUBLIC_SUBGRAPH_URL`: optional client-side fallback endpoint
- `NEXT_PUBLIC_FACTORY_SEPOLIA`: factory preset used by the create flow
- `NEXT_PUBLIC_DEFAULT_ORACLE_SEPOLIA`: default oracle preset
- `NEXT_PUBLIC_DEFAULT_CONFIG_GUARD_SEPOLIA`: config guard preset
- `NEXT_PUBLIC_DEFAULT_BUY_GUARD_SEPOLIA`: buy guard preset
- `NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN_SEPOLIA`: default payment asset preset

Mainnet-style preset variables also exist, but the current product flow is primarily tuned for Base Sepolia.

## Local development

Install dependencies from the repository root:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm --dir apps/web dev
```

Build for production:

```bash
pnpm --dir apps/web build
```

Start the production server locally:

```bash
pnpm --dir apps/web start
```

## Data flow

The frontend uses two read paths:

- indexed reads from the subgraph for series lists, assets, box history, and reward distributions
- direct onchain reads for interaction-critical states where indexer lag would create bad UX

Typical examples:

- series and asset summaries come from the subgraph
- transaction progress is surfaced with toasts
- some ownership and fulfillment states are verified onchain after open or claim

## Useful scripts

```bash
pnpm --dir apps/web dev
pnpm --dir apps/web build
pnpm --dir apps/web lint
pnpm --dir apps/web graphclient:schema
pnpm --dir apps/web graphclient:build
```

## Implementation notes

- UI text is localized through the app message files.
- Loading states should prefer the shared `Skeleton` component over ad hoc placeholder text.
- Empty states should prefer the shared `EmptyState` component for consistency.
- The create flow is intentionally constrained to a readable preset model rather than a fully generic protocol console.

## Related modules

- Contracts: [../contracts/README.md](../contracts/README.md)
- Subgraph: [../subgraph/README.md](../subgraph/README.md)
