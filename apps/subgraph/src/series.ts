import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
    BlindBoxPurchased,
    BlindBoxOpened,
    PrizesClaimed,
    PrizeDistributed,
    SaleConfigUpdated,
    LeftoverPolicyUpdated,
    LeftoversSwept,
} from "../generated/templates/JunkyardSeries/JunkyardSeries";
import {
    Asset,
    BlindBox,
    PrizeDistribution,
    Series,
    SeriesMapping,
    Transaction,
} from "../generated/schema";
import {
    getOrCreateAssetConfig,
    getOrCreateDailyStats,
    getOrCreateGlobal,
    markDailyNewUser,
    markDailyUniqueBuyer,
    saveAssetConfigBalance,
    touchUser,
} from "./helpers";

/**
 * Handle BlindBoxPurchased event
 */
export function handleBlindBoxPurchased(event: BlindBoxPurchased): void {
    // Find the series - we need to derive series ID from the event address
    // The event.address is the Series contract address
    // We'll search for the series by its seriesAddress
    let seriesAddress = event.address;

    // Load series - we need to iterate or use a better approach
    // For now, we'll create a helper to find series by address
    let series = findSeriesByAddress(seriesAddress);

    if (series == null) {
        // Series not found, skip
        return;
    }

    // Update series stats
    series.totalPurchased = series.totalPurchased.plus(BigInt.fromI32(1));
    series.totalRevenue = series.totalRevenue.plus(event.params.price);
    series.configLocked = true;
    series.save();

    // Update global stats
    let global = getOrCreateGlobal();
    global.totalBlindBoxes = global.totalBlindBoxes.plus(BigInt.fromI32(1));
    global.totalRevenue = global.totalRevenue.plus(event.params.price);
    global.save();

    // Update user stats
    let userResult = touchUser(event.params.buyer, event.block.timestamp);
    let user = userResult.user;
    user.totalPurchased = user.totalPurchased.plus(BigInt.fromI32(1));
    user.totalSpent = user.totalSpent.plus(event.params.price);
    user.save();
    if (userResult.isNew) {
        markDailyNewUser(event.block.timestamp);
    }

    // Update daily stats
    let dailyStats = getOrCreateDailyStats(event.block.timestamp);
    dailyStats.totalPurchases = dailyStats.totalPurchases.plus(BigInt.fromI32(1));
    dailyStats.totalRevenue = dailyStats.totalRevenue.plus(event.params.price);
    dailyStats.save();
    markDailyUniqueBuyer(user, event.block.timestamp);

    // Create transaction record
    let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let transaction = new Transaction(txId);
    transaction.series = series.id;
    transaction.user = user.id;
    transaction.type = "PURCHASE";
    transaction.blindBoxId = event.params.boxId;
    transaction.price = event.params.price;
    transaction.paymentToken = series.paymentToken;
    transaction.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.transactionHash = event.transaction.hash;
    transaction.save();
}

/**
 * Handle BlindBoxOpened event
 */
export function handleBlindBoxOpened(event: BlindBoxOpened): void {
    // Load blind box
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    let blindBoxId = series.nftAddress.toHex() + "-" + event.params.boxId.toString();
    let blindBox = BlindBox.load(blindBoxId);

    if (blindBox == null) return;

    // Update blind box status
    blindBox.status = "OPENED";
    blindBox.openedAt = event.block.timestamp;
    blindBox.openedTx = event.transaction.hash;
    blindBox.requestId = event.params.requestId;
    blindBox.save();

    // Update series stats
    series.totalOpened = series.totalOpened.plus(BigInt.fromI32(1));
    series.save();

    // Update user stats
    let userResult = touchUser(event.params.opener, event.block.timestamp);
    let user = userResult.user;
    user.totalOpened = user.totalOpened.plus(BigInt.fromI32(1));
    user.save();
    if (userResult.isNew) {
        markDailyNewUser(event.block.timestamp);
    }

    // Update daily stats
    let dailyStats = getOrCreateDailyStats(event.block.timestamp);
    dailyStats.totalOpens = dailyStats.totalOpens.plus(BigInt.fromI32(1));
    dailyStats.save();

    // Create transaction record
    let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let transaction = new Transaction(txId);
    transaction.series = series.id;
    transaction.user = user.id;
    transaction.type = "OPEN";
    transaction.blindBoxId = event.params.boxId;
    transaction.oracleFeePaid = event.params.oracleFeePaid;
    transaction.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.transactionHash = event.transaction.hash;
    transaction.save();
}

/**
 * Handle PrizesClaimed event
 */
export function handlePrizesClaimed(event: PrizesClaimed): void {
    // Load blind box
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    let blindBoxId = series.nftAddress.toHex() + "-" + event.params.boxId.toString();
    let blindBox = BlindBox.load(blindBoxId);

    if (blindBox == null) return;

    // Update blind box status
    blindBox.status = "CLAIMED";
    blindBox.claimedAt = event.block.timestamp;
    blindBox.claimedTx = event.transaction.hash;
    blindBox.save();

    // Update series stats
    series.totalClaimed = series.totalClaimed.plus(BigInt.fromI32(1));
    series.save();

    // Update user stats
    let userResult = touchUser(event.params.claimer, event.block.timestamp);
    let user = userResult.user;
    user.totalClaimed = user.totalClaimed.plus(BigInt.fromI32(1));
    user.save();
    if (userResult.isNew) {
        markDailyNewUser(event.block.timestamp);
    }

    // Update daily stats
    let dailyStats = getOrCreateDailyStats(event.block.timestamp);
    dailyStats.totalClaims = dailyStats.totalClaims.plus(BigInt.fromI32(1));
    dailyStats.save();

    // Create transaction record
    let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let transaction = new Transaction(txId);
    transaction.series = series.id;
    transaction.user = user.id;
    transaction.type = "CLAIM";
    transaction.blindBoxId = event.params.boxId;
    transaction.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.transactionHash = event.transaction.hash;
    transaction.save();
}

/**
 * Handle PrizeDistributed event
 * Updates asset balances and records prize distribution history
 */
export function handlePrizeDistributed(event: PrizeDistributed): void {
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    let blindBoxEntityId = series.nftAddress.toHex() + "-" + event.params.boxId.toString();
    let blindBox = BlindBox.load(blindBoxEntityId);
    if (blindBox == null) return;

    // Build Asset ID to match prizepool deposit IDs:
    // seriesId-assetContract-tokenId (for NFTs) or seriesId-assetContract-0 (for ERC20)
    let tokenId = event.params.assetType == 0 ? BigInt.zero() : event.params.tokenId;
    let assetId = series.id + "-" + event.params.assetContract.toHex() + "-" + tokenId.toString();

    let asset = Asset.load(assetId);
    if (asset == null) {
        asset = new Asset(assetId);
        asset.series = series.id;
        asset.assetContract = event.params.assetContract;
        asset.tokenId = tokenId;
        asset.totalDeposited = BigInt.zero();
        asset.totalDistributed = BigInt.zero();
        asset.currentBalance = BigInt.zero();
        asset.whitelisted = true;

        if (event.params.assetType == 0) {
            asset.assetType = "ERC20";
        } else if (event.params.assetType == 1) {
            asset.assetType = "ERC721";
        } else {
            asset.assetType = "ERC1155";
        }
    }

    let assetConfig = getOrCreateAssetConfig(
        series.id,
        event.params.assetContract,
        event.block.timestamp,
    );
    if (assetConfig.assetType == null) {
        assetConfig.assetType = asset.assetType;
    }
    assetConfig.whitelisted = true;
    assetConfig.configured = true;
    assetConfig.totalDistributed = assetConfig.totalDistributed.plus(event.params.amount);
    let nextConfigBalance = assetConfig.currentBalance.ge(event.params.amount)
        ? assetConfig.currentBalance.minus(event.params.amount)
        : BigInt.zero();
    saveAssetConfigBalance(assetConfig, nextConfigBalance, event.block.timestamp);

    // Update balances
    asset.config = assetConfig.id;
    asset.whitelisted = assetConfig.whitelisted;
    asset.totalDistributed = asset.totalDistributed.plus(event.params.amount);
    if (asset.currentBalance.ge(event.params.amount)) {
        asset.currentBalance = asset.currentBalance.minus(event.params.amount);
    } else {
        asset.currentBalance = BigInt.zero();
    }
    asset.save();

    // Record distribution
    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let dist = new PrizeDistribution(id);
    dist.blindBox = blindBox.id;
    dist.asset = asset.id;
    dist.recipient = event.params.recipient;
    dist.amount = event.params.amount;
    dist.timestamp = event.block.timestamp;
    dist.transaction = event.transaction.hash;
    dist.save();
}

/**
 * Handle SaleConfigUpdated event
 * Keeps Series config fields in sync after creator updates.
 */
export function handleSaleConfigUpdated(event: SaleConfigUpdated): void {
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    series.price = event.params.price;
    series.startTime = event.params.startTime;
    series.endTime = event.params.endTime;
    series.maxSupply = event.params.maxSupply;
    series.save();
}

/**
 * Handle LeftoverPolicyUpdated event
 */
export function handleLeftoverPolicyUpdated(event: LeftoverPolicyUpdated): void {
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    series.leftoverMode = event.params.mode;
    series.leftoverRecipient = event.params.recipient;
    series.save();
}

/**
 * Handle LeftoversSwept event
 */
export function handleLeftoversSwept(event: LeftoversSwept): void {
    let series = findSeriesByAddress(event.address);
    if (series == null) return;

    series.leftoversSweptAt = event.block.timestamp;
    series.leftoversSweptTx = event.transaction.hash;
    series.leftoversSweptTo = event.params.recipient;
    series.save();
}

/**
 * Helper to find series by contract address
 */
function findSeriesByAddress(address: Address): Series | null {
    let mapping = SeriesMapping.load(address.toHex());
    if (mapping == null) {
        return null;
    }
    return Series.load(mapping.seriesId);
}
