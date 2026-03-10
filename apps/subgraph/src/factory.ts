import { BigInt } from "@graphprotocol/graph-ts";
import { SeriesCreated } from "../generated/JunkyardFactory/JunkyardFactory";
import { JunkyardSeries, JunkyardNFT, JunkyardPrizePool } from "../generated/templates";
import { Series, SeriesMapping } from "../generated/schema";
import { getOrCreateGlobal, markDailyNewUser, touchUser } from "./helpers";

/**
 * Handle SeriesCreated event
 * Creates a new Series entity and starts tracking its contracts
 */
export function handleSeriesCreated(event: SeriesCreated): void {
    // Update global stats
    let global = getOrCreateGlobal();
    global.totalSeries = global.totalSeries.plus(BigInt.fromI32(1));
    global.save();

    // Create or load creator user
    let creatorResult = touchUser(event.params.creator, event.block.timestamp);
    let creator = creatorResult.user;
    if (creatorResult.isNew) {
        markDailyNewUser(event.block.timestamp);
    }

    // Create Series entity
    let series = new Series(event.params.seriesId.toString());
    series.seriesAddress = event.params.seriesAddress;
    series.nftAddress = event.params.nftCollection;
    series.creator = creator.id;

    // Initialize stats
    series.totalPurchased = BigInt.zero();
    series.totalOpened = BigInt.zero();
    series.totalClaimed = BigInt.zero();
    series.totalRevenue = BigInt.zero();
    series.maxAssetTypesPerOpening = event.params.maxAssetTypesPerOpening;
    series.activeAssetTypeCount = 0;

    // Default lock + leftover policy
    series.configLocked = false;
    series.leftoverMode = 0; // RETURN
    series.leftoverRecipient = event.params.creator;

    // Metadata
    series.createdAt = event.block.timestamp;
    series.createdTx = event.transaction.hash;

    series.price = event.params.price;
    series.paymentToken = event.params.paymentToken;
    series.maxSupply = event.params.maxSupply;
    series.startTime = event.params.startTime;
    series.endTime = event.params.endTime;
    series.configGuard = event.params.configGuard;
    series.buyGuard = event.params.buyGuard;
    series.oracle = event.params.oracle;
    series.prizePoolAddress = event.params.prizePoolAddress;

    series.save();

    // Create mappings for efficient lookup
    let seriesMapping = new SeriesMapping(event.params.seriesAddress.toHex());
    seriesMapping.seriesId = series.id;
    seriesMapping.contractType = "SERIES";
    seriesMapping.save();

    let nftMapping = new SeriesMapping(event.params.nftCollection.toHex());
    nftMapping.seriesId = series.id;
    nftMapping.contractType = "NFT";
    nftMapping.save();

    let poolMapping = new SeriesMapping(event.params.prizePoolAddress.toHex());
    poolMapping.seriesId = series.id;
    poolMapping.contractType = "PRIZE_POOL";
    poolMapping.save();

    // Start tracking the new contracts
    JunkyardSeries.create(event.params.seriesAddress);
    JunkyardNFT.create(event.params.nftCollection);

    JunkyardPrizePool.create(event.params.prizePoolAddress);
}
