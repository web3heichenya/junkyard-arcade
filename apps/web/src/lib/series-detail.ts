import { cache } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import { erc20Abi } from '@/abi/erc20';
import { erc721MetadataAbi } from '@/abi/erc721Metadata';
import { subgraphRequest } from '@/lib/subgraph';

export type Asset = {
  id: string;
  assetType: 'ERC20' | 'ERC721' | 'ERC1155';
  assetContract: string;
  tokenId?: string | null;
  totalDeposited: string;
  totalDistributed: string;
  currentBalance: string;
};

export type AssetConfig = {
  id: string;
  assetContract: string;
  assetType?: 'ERC20' | 'ERC721' | 'ERC1155' | null;
  whitelisted: boolean;
  configured: boolean;
  maxShareBps: number;
  totalDeposited: string;
  totalDistributed: string;
  currentBalance: string;
  updatedAt: string;
};

export type LeftoverTransfer = {
  id: string;
  recipient: string;
  assetType: 'ERC20' | 'ERC721' | 'ERC1155';
  assetContract: string;
  tokenId: string;
  amount: string;
  timestamp: string;
  transaction: string;
};

export type SeriesDetail = {
  id: string;
  seriesAddress: string;
  nftAddress: string;
  prizePoolAddress: string;
  creator: { id: string; address: string };
  price: string;
  paymentToken: string;
  maxSupply: string;
  maxAssetTypesPerOpening: number;
  startTime: string;
  endTime: string;
  configGuard: string;
  buyGuard: string;
  oracle: string;
  configLocked: boolean;
  leftoverMode: number;
  leftoverRecipient: string;
  leftoversSweptAt?: string | null;
  leftoversSweptTo?: string | null;
  totalPurchased: string;
  totalOpened: string;
  totalClaimed: string;
  totalRevenue: string;
  activeAssetTypeCount: number;
  assetConfigs: AssetConfig[];
  assets: Asset[];
  leftoverTransfers: LeftoverTransfer[];
  nftName: string | null;
  nftSymbol: string | null;
  paymentSymbol: string | null;
  paymentDecimals: number | null;
};

type RawSeriesDetail = Omit<
  SeriesDetail,
  'nftName' | 'nftSymbol' | 'paymentSymbol' | 'paymentDecimals'
>;

const ZERO = '0x0000000000000000000000000000000000000000';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function isHexAddress(value: string): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 42;
}

async function attachMetadata(series: RawSeriesDetail): Promise<SeriesDetail> {
  const contracts: Array<{
    address: `0x${string}`;
    abi: typeof erc721MetadataAbi | typeof erc20Abi;
    functionName: 'name' | 'symbol' | 'decimals';
  }> = [];

  if (isHexAddress(series.nftAddress)) {
    contracts.push(
      { address: series.nftAddress, abi: erc721MetadataAbi, functionName: 'name' },
      { address: series.nftAddress, abi: erc721MetadataAbi, functionName: 'symbol' }
    );
  }

  const hasErc20Payment =
    isHexAddress(series.paymentToken) && series.paymentToken.toLowerCase() !== ZERO;
  const paymentTokenAddress = hasErc20Payment ? (series.paymentToken as `0x${string}`) : null;

  if (hasErc20Payment) {
    contracts.push(
      { address: paymentTokenAddress as `0x${string}`, abi: erc20Abi, functionName: 'symbol' },
      { address: paymentTokenAddress as `0x${string}`, abi: erc20Abi, functionName: 'decimals' }
    );
  }

  if (contracts.length === 0) {
    return {
      ...series,
      nftName: null,
      nftSymbol: null,
      paymentSymbol: null,
      paymentDecimals: null,
    };
  }

  try {
    const results = await publicClient.multicall({
      contracts,
      allowFailure: true,
    });

    let cursor = 0;
    const nftName =
      isHexAddress(series.nftAddress) && results[cursor]?.status === 'success'
        ? (results[cursor].result as string)
        : null;
    cursor += isHexAddress(series.nftAddress) ? 1 : 0;

    const nftSymbol =
      isHexAddress(series.nftAddress) && results[cursor]?.status === 'success'
        ? (results[cursor].result as string)
        : null;
    cursor += isHexAddress(series.nftAddress) ? 1 : 0;

    const paymentSymbol =
      hasErc20Payment && results[cursor]?.status === 'success'
        ? (results[cursor].result as string)
        : null;
    cursor += hasErc20Payment ? 1 : 0;

    const paymentDecimals =
      hasErc20Payment && results[cursor]?.status === 'success'
        ? Number(results[cursor].result)
        : null;

    return {
      ...series,
      nftName,
      nftSymbol,
      paymentSymbol,
      paymentDecimals,
    };
  } catch {
    return {
      ...series,
      nftName: null,
      nftSymbol: null,
      paymentSymbol: null,
      paymentDecimals: null,
    };
  }
}

export const getSeriesDetail = cache(
  async (id: string): Promise<{ series: SeriesDetail | null; error: string | null }> => {
    try {
      const data = await subgraphRequest<{ series: RawSeriesDetail | null }>(
        `
                query SeriesById($id: ID!) {
                  series(id: $id) {
                    id
                    seriesAddress
                    nftAddress
                    prizePoolAddress
                    creator { id address }
                    price
                    paymentToken
                    maxSupply
                    maxAssetTypesPerOpening
                    startTime
                    endTime
                    configGuard
                    buyGuard
                    oracle
                    configLocked
                    leftoverMode
                    leftoverRecipient
                    leftoversSweptAt
                    leftoversSweptTo
                    totalPurchased
                    totalOpened
                    totalClaimed
                    totalRevenue
                    activeAssetTypeCount
                    assetConfigs(first: 50, orderBy: updatedAt, orderDirection: desc) {
                      id
                      assetContract
                      assetType
                      whitelisted
                      configured
                      maxShareBps
                      totalDeposited
                      totalDistributed
                      currentBalance
                      updatedAt
                    }
                    assets(first: 50, orderBy: totalDeposited, orderDirection: desc) {
                      id
                      assetType
                      assetContract
                      tokenId
                      totalDeposited
                      totalDistributed
                      currentBalance
                    }
                    leftoverTransfers(first: 50, orderBy: timestamp, orderDirection: desc) {
                      id
                      recipient
                      assetType
                      assetContract
                      tokenId
                      amount
                      timestamp
                      transaction
                    }
                  }
                }
                `,
        { id },
        { cache: 'no-store' }
      );

      if (!data.series) {
        return { series: null, error: null };
      }

      return {
        series: await attachMetadata(data.series),
        error: null,
      };
    } catch (error) {
      return {
        series: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);
