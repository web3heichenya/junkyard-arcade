import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
    AssetConfig,
    DailyBuyerMarker,
    DailyStats,
    Global,
    Series,
    User,
} from "../generated/schema";

export class UserTouchResult {
    user: User;
    isNew: boolean;

    constructor(user: User, isNew: boolean) {
        this.user = user;
        this.isNew = isNew;
    }
}

/**
 * Load or create Global singleton entity
 */
export function getOrCreateGlobal(): Global {
    let global = Global.load("1");

    if (global == null) {
        global = new Global("1");
        global.totalSeries = BigInt.zero();
        global.totalBlindBoxes = BigInt.zero();
        global.totalRevenue = BigInt.zero();
        global.save();
    }

    return global;
}

/**
 * Load or create User entity
 */
export function touchUser(address: Bytes, timestamp: BigInt): UserTouchResult {
    let id = address.toHexString();
    let user = User.load(id);
    let isNew = false;

    if (user == null) {
        user = new User(id);
        user.address = address;
        user.totalPurchased = BigInt.zero();
        user.totalOpened = BigInt.zero();
        user.totalClaimed = BigInt.zero();
        user.totalSpent = BigInt.zero();
        user.firstSeenAt = timestamp;
        isNew = true;
    }

    user.lastActivityAt = timestamp;
    user.save();

    return new UserTouchResult(user as User, isNew);
}

export function getOrCreateUser(address: Bytes, timestamp: BigInt): User {
    return touchUser(address, timestamp).user;
}

/**
 * Update user last activity timestamp
 */
export function updateUserActivity(address: Bytes, timestamp: BigInt): void {
    let user = getOrCreateUser(address, timestamp);
    user.lastActivityAt = timestamp;
    user.save();
}

export function getDayString(timestamp: BigInt): string {
    let day = timestamp.toI32() / 86400;
    return day.toString();
}

/**
 * Get or create daily stats entity
 */
export function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
    let dayString = getDayString(timestamp);

    let stats = DailyStats.load(dayString);

    if (stats == null) {
        stats = new DailyStats(dayString);
        stats.date = dayString;
        stats.totalPurchases = BigInt.zero();
        stats.totalOpens = BigInt.zero();
        stats.totalClaims = BigInt.zero();
        stats.totalRevenue = BigInt.zero();
        stats.uniqueBuyers = BigInt.zero();
        stats.newUsers = BigInt.zero();
        stats.save();
    }

    return stats;
}

export function markDailyUniqueBuyer(user: User, timestamp: BigInt): void {
    let dayString = getDayString(timestamp);
    let markerId = dayString + "-" + user.id;
    let marker = DailyBuyerMarker.load(markerId);

    if (marker != null) {
        return;
    }

    marker = new DailyBuyerMarker(markerId);
    marker.day = dayString;
    marker.user = user.id;
    marker.save();

    let stats = getOrCreateDailyStats(timestamp);
    stats.uniqueBuyers = stats.uniqueBuyers.plus(BigInt.fromI32(1));
    stats.save();
}

export function markDailyNewUser(timestamp: BigInt): void {
    let stats = getOrCreateDailyStats(timestamp);
    stats.newUsers = stats.newUsers.plus(BigInt.fromI32(1));
    stats.save();
}

/**
 * Load or create contract-level asset config for a series.
 */
export function getOrCreateAssetConfig(
    seriesId: string,
    assetContract: Bytes,
    timestamp: BigInt,
): AssetConfig {
    let id = seriesId + "-" + assetContract.toHexString();
    let config = AssetConfig.load(id);

    if (config == null) {
        config = new AssetConfig(id);
        config.series = seriesId;
        config.assetContract = assetContract;
        config.whitelisted = false;
        config.configured = false;
        config.maxShareBps = 0;
        config.totalDeposited = BigInt.zero();
        config.totalDistributed = BigInt.zero();
        config.currentBalance = BigInt.zero();
    }

    config.updatedAt = timestamp;
    return config;
}

/**
 * Persist a contract-level asset balance and keep Series.activeAssetTypeCount in sync.
 */
export function saveAssetConfigBalance(
    config: AssetConfig,
    newBalance: BigInt,
    timestamp: BigInt,
): void {
    let hadBalance = config.currentBalance.gt(BigInt.zero());
    let hasBalance = newBalance.gt(BigInt.zero());

    config.currentBalance = newBalance;
    config.updatedAt = timestamp;
    config.save();

    if (hadBalance == hasBalance) {
        return;
    }

    let series = Series.load(config.series);
    if (series == null) {
        return;
    }

    if (hasBalance) {
        series.activeAssetTypeCount = series.activeAssetTypeCount + 1;
    } else if (series.activeAssetTypeCount > 0) {
        series.activeAssetTypeCount = series.activeAssetTypeCount - 1;
    }

    series.save();
}
