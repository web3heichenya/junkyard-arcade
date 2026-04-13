import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
    AssetBalanceSynced,
    AssetTokenBalanceSynced,
    AssetConfigInitialized,
    AssetsDeposited,
    AssetWhitelisted,
    LeftoverSwept,
} from "../generated/templates/JunkyardPrizePool/JunkyardPrizePool";
import { Asset, AssetDeposit, LeftoverTransfer, SeriesMapping } from "../generated/schema";
import { getOrCreateAssetConfig, saveAssetConfigBalance } from "./helpers";

/**
 * Handle AssetsDeposited event
 */
export function handleAssetsDeposited(event: AssetsDeposited): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let seriesIdStr = seriesId as string;
    let assetConfig = getOrCreateAssetConfig(
        seriesIdStr,
        event.params.assetContract,
        event.block.timestamp,
    );

    assetConfig.whitelisted = true;
    assetConfig.configured = true;
    assetConfig.assetType = toAssetType(event.params.assetType);
    assetConfig.totalDeposited = assetConfig.totalDeposited.plus(event.params.amount);

    let nextBalance = assetConfig.currentBalance.plus(event.params.amount);
    saveAssetConfigBalance(assetConfig, nextBalance, event.block.timestamp);

    let assetId = buildAssetId(
        seriesIdStr,
        event.params.assetContract,
        event.params.assetType,
        event.params.tokenId,
    );
    let asset = Asset.load(assetId);
    if (asset == null) {
        asset = new Asset(assetId);
        asset.series = seriesIdStr;
        asset.config = assetConfig.id;
        asset.assetType = toAssetType(event.params.assetType);
        asset.assetContract = event.params.assetContract;
        asset.tokenId = event.params.assetType == 0 ? BigInt.zero() : event.params.tokenId;
        asset.totalDeposited = BigInt.zero();
        asset.totalDistributed = BigInt.zero();
        asset.currentBalance = BigInt.zero();
        asset.whitelisted = true;
    }

    asset.config = assetConfig.id;
    asset.whitelisted = assetConfig.whitelisted;
    asset.totalDeposited = asset.totalDeposited.plus(event.params.amount);
    asset.currentBalance = asset.currentBalance.plus(event.params.amount);
    asset.save();

    let depositId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let deposit = new AssetDeposit(depositId);
    deposit.asset = asset.id;
    deposit.depositor = event.params.depositor;
    deposit.amount = event.params.amount;
    deposit.timestamp = event.block.timestamp;
    deposit.transaction = event.transaction.hash;
    deposit.save();
}

/**
 * Handle immutable asset config initialization.
 */
export function handleAssetConfigInitialized(event: AssetConfigInitialized): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let assetConfig = getOrCreateAssetConfig(
        seriesId as string,
        event.params.asset,
        event.block.timestamp,
    );
    assetConfig.configured = true;
    assetConfig.whitelisted = true;
    assetConfig.maxShareBps = event.params.maxShareBps;
    assetConfig.save();
}

/**
 * Handle AssetWhitelisted event
 */
export function handleAssetWhitelisted(event: AssetWhitelisted): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let assetConfig = getOrCreateAssetConfig(
        seriesId as string,
        event.params.asset,
        event.block.timestamp,
    );
    assetConfig.whitelisted = event.params.status;
    assetConfig.save();
}

/**
 * Handle AssetBalanceSynced event
 */
export function handleAssetBalanceSynced(event: AssetBalanceSynced): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let assetConfig = getOrCreateAssetConfig(
        seriesId as string,
        event.params.asset,
        event.block.timestamp,
    );
    saveAssetConfigBalance(assetConfig, event.params.newBalance, event.block.timestamp);

    let fungibleAsset = Asset.load((seriesId as string) + "-" + event.params.asset.toHex() + "-0");
    if (fungibleAsset != null && fungibleAsset.assetType == "ERC20") {
        fungibleAsset.currentBalance = event.params.newBalance;
        fungibleAsset.save();
    }
}

/**
 * Handle AssetTokenBalanceSynced event
 */
export function handleAssetTokenBalanceSynced(event: AssetTokenBalanceSynced): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let seriesIdStr = seriesId as string;
    let assetConfig = getOrCreateAssetConfig(
        seriesIdStr,
        event.params.asset,
        event.block.timestamp,
    );
    assetConfig.whitelisted = true;
    assetConfig.configured = true;
    assetConfig.assetType = toAssetType(event.params.assetType);
    assetConfig.save();

    let assetId = buildAssetId(
        seriesIdStr,
        event.params.asset,
        event.params.assetType,
        event.params.tokenId,
    );
    let asset = Asset.load(assetId);
    if (asset == null) {
        asset = new Asset(assetId);
        asset.series = seriesIdStr;
        asset.totalDeposited = BigInt.zero();
        asset.totalDistributed = BigInt.zero();
        asset.whitelisted = true;
    }

    asset.config = assetConfig.id;
    asset.assetType = toAssetType(event.params.assetType);
    asset.assetContract = event.params.asset;
    asset.tokenId = event.params.assetType == 0 ? BigInt.zero() : event.params.tokenId;
    asset.whitelisted = assetConfig.whitelisted;
    asset.currentBalance = event.params.newBalance;
    asset.save();
}

/**
 * Handle LeftoverSwept event
 * Records sweep history and decrements currentBalance to keep pool state accurate.
 */
export function handleLeftoverSwept(event: LeftoverSwept): void {
    let seriesId = findSeriesIdByPoolAddress(event.address);
    if (seriesId == null) return;

    let seriesIdStr = seriesId as string;
    let tokenId = event.params.assetType == 0 ? BigInt.zero() : event.params.tokenId;
    let assetId = seriesIdStr + "-" + event.params.assetContract.toHex() + "-" + tokenId.toString();

    let asset = Asset.load(assetId);
    if (asset != null) {
        if (asset.currentBalance.ge(event.params.amount)) {
            asset.currentBalance = asset.currentBalance.minus(event.params.amount);
        } else {
            asset.currentBalance = BigInt.zero();
        }
        asset.save();
    }

    let assetConfig = getOrCreateAssetConfig(
        seriesIdStr,
        event.params.assetContract,
        event.block.timestamp,
    );
    let nextBalance = assetConfig.currentBalance.ge(event.params.amount)
        ? assetConfig.currentBalance.minus(event.params.amount)
        : BigInt.zero();
    saveAssetConfigBalance(assetConfig, nextBalance, event.block.timestamp);

    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let xfer = new LeftoverTransfer(id);
    xfer.series = seriesIdStr;
    xfer.recipient = event.params.recipient;
    xfer.assetType = toAssetType(event.params.assetType);
    xfer.assetContract = event.params.assetContract;
    xfer.tokenId = tokenId;
    xfer.amount = event.params.amount;
    xfer.timestamp = event.block.timestamp;
    xfer.transaction = event.transaction.hash;
    xfer.save();
}

function buildAssetId(
    seriesId: string,
    assetContract: Address,
    assetType: i32,
    tokenId: BigInt,
): string {
    let normalizedTokenId = assetType == 0 ? BigInt.zero() : tokenId;
    return seriesId + "-" + assetContract.toHex() + "-" + normalizedTokenId.toString();
}

function toAssetType(assetType: i32): string {
    if (assetType == 0) {
        return "ERC20";
    }
    if (assetType == 1) {
        return "ERC721";
    }
    return "ERC1155";
}

/**
 * Helper to find series ID by prize pool address
 */
function findSeriesIdByPoolAddress(poolAddress: Address): string | null {
    let mapping = SeriesMapping.load(poolAddress.toHex());
    if (mapping == null || mapping.contractType != "PRIZE_POOL") {
        return null;
    }
    return mapping.seriesId;
}
