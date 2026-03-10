import { cache } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import { erc721MetadataAbi } from '@/abi/erc721Metadata';
import { subgraphRequest } from '@/lib/subgraph';

export type SeriesItem = {
  id: string;
  seriesAddress: string;
  nftAddress: string;
  prizePoolAddress: string;
  price: string;
  paymentToken: string;
  maxSupply: string;
  maxAssetTypesPerOpening: number;
  startTime: string;
  endTime: string;
  activeAssetTypeCount: number;
  totalPurchased: string;
  totalOpened: string;
  totalClaimed: string;
  totalRevenue: string;
  nftName: string | null;
  nftSymbol: string | null;
};

type RawSeriesItem = Omit<SeriesItem, 'nftName' | 'nftSymbol'>;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function isHexAddress(value: string): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 42;
}

async function attachNftMetadata(items: RawSeriesItem[]): Promise<SeriesItem[]> {
  const nftAddresses = [...new Set(items.map((item) => item.nftAddress).filter(isHexAddress))];
  if (nftAddresses.length === 0) {
    return items.map((item) => ({ ...item, nftName: null, nftSymbol: null }));
  }

  try {
    const contracts = nftAddresses.flatMap((address) => [
      { address, abi: erc721MetadataAbi, functionName: 'name' as const },
      { address, abi: erc721MetadataAbi, functionName: 'symbol' as const },
    ]);
    const results = await publicClient.multicall({
      contracts,
      allowFailure: true,
    });

    const metadataByAddress = new Map<
      string,
      { nftName: string | null; nftSymbol: string | null }
    >();
    for (let i = 0; i < nftAddresses.length; i += 1) {
      const nameResult = results[i * 2];
      const symbolResult = results[i * 2 + 1];

      metadataByAddress.set(nftAddresses[i], {
        nftName: nameResult?.status === 'success' ? nameResult.result : null,
        nftSymbol: symbolResult?.status === 'success' ? symbolResult.result : null,
      });
    }

    return items.map((item) => ({
      ...item,
      nftName: metadataByAddress.get(item.nftAddress)?.nftName ?? null,
      nftSymbol: metadataByAddress.get(item.nftAddress)?.nftSymbol ?? null,
    }));
  } catch {
    return items.map((item) => ({ ...item, nftName: null, nftSymbol: null }));
  }
}

export const getSeriesCollection = cache(
  async (): Promise<{ items: SeriesItem[]; error: string | null }> => {
    try {
      const data = await subgraphRequest<{ series_collection: RawSeriesItem[] }>(
        `
            query SeriesList($first: Int!) {
              series_collection(first: $first, orderBy: createdAt, orderDirection: desc) {
                id
                seriesAddress
                nftAddress
                prizePoolAddress
                price
                paymentToken
                maxSupply
                maxAssetTypesPerOpening
                startTime
                endTime
                activeAssetTypeCount
                totalPurchased
                totalOpened
                totalClaimed
                totalRevenue
              }
            }
            `,
        { first: 12 },
        { cache: 'no-store' }
      );

      return {
        items: await attachNftMetadata(data.series_collection ?? []),
        error: null,
      };
    } catch (error) {
      return {
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

export function getSeriesState(
  item: Pick<SeriesItem, 'endTime' | 'maxSupply' | 'totalPurchased' | 'activeAssetTypeCount'>
) {
  const now = Math.floor(Date.now() / 1000);
  const end = Number(item.endTime);
  const sold = BigInt(item.totalPurchased || '0');
  const max = BigInt(item.maxSupply || '0');

  if (end > 0 && now > end) return 'ended';
  if (max > 0n && sold >= max) return 'soldOut';
  if (item.activeAssetTypeCount === 0) return 'awaitingRefill';
  return 'live';
}

export function sumBy(
  items: SeriesItem[],
  key: keyof Pick<SeriesItem, 'totalPurchased' | 'totalOpened' | 'totalClaimed'>
) {
  return items.reduce((acc, item) => acc + BigInt(item[key] || '0'), 0n);
}

export function formatCompact(value: bigint) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(value)
  );
}
