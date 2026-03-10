import { Address } from "@graphprotocol/graph-ts";
import { BlindBoxMinted, BlindBoxBurned } from "../generated/templates/JunkyardNFT/JunkyardNFT";
import { BlindBox, SeriesMapping } from "../generated/schema";
import { markDailyNewUser, touchUser } from "./helpers";

/**
 * Handle BlindBoxMinted event
 */
export function handleBlindBoxMinted(event: BlindBoxMinted): void {
    // We need to find the series this NFT belongs to
    let seriesId = findSeriesIdByNftAddress(event.address);

    if (seriesId == null) {
        // If we can't find the series, skip this event
        // This shouldn't happen if SeriesCreated is processed first
        return;
    }

    // Create BlindBox entity
    // ID format: nftAddress-tokenId
    let id = event.address.toHex() + "-" + event.params.tokenId.toString();
    let blindBox = new BlindBox(id);

    let userResult = touchUser(event.params.to, event.block.timestamp);
    if (userResult.isNew) {
        markDailyNewUser(event.block.timestamp);
    }

    blindBox.series = seriesId as string; // Type cast after null check
    blindBox.tokenId = event.params.tokenId;
    blindBox.owner = userResult.user.id;
    blindBox.status = "UNOPENED";
    blindBox.purchasedAt = event.block.timestamp;
    blindBox.purchasedTx = event.transaction.hash;
    blindBox.save();
}

/**
 * Handle BlindBoxBurned event
 */
export function handleBlindBoxBurned(event: BlindBoxBurned): void {
    // Update blind box status
    let id = event.address.toHex() + "-" + event.params.tokenId.toString();
    let blindBox = BlindBox.load(id);

    if (blindBox != null) {
        // Burning happens in the claim tx; preserve CLAIMED as the semantic final status.
        if (blindBox.status != "CLAIMED") {
            blindBox.status = "BURNED";
        }
        blindBox.save();
    }
}

/**
 * Helper to find series ID by NFT address
 */
function findSeriesIdByNftAddress(nftAddress: Address): string | null {
    let mapping = SeriesMapping.load(nftAddress.toHex());
    if (mapping == null || mapping.contractType != "NFT") {
        return null;
    }
    return mapping.seriesId;
}
