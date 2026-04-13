// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IJunkyardSeries} from "./IJunkyardSeries.sol";

/// @title IJunkyardPrizePool
/// @notice Interface for prize pool management
/// @dev Manages asset deposits and distribution for a series
interface IJunkyardPrizePool {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      DATA STRUCTURES                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Asset type registry entry
    struct AssetType {
        address assetContract; // Asset contract address
        IJunkyardSeries.AssetType assetType; // ERC20/ERC721/ERC1155
        uint256 balance; // Current balance for filtering
    }

    /// @notice Immutable per-asset distribution configuration
    struct AssetConfig {
        bool configured;
        uint16 maxShareBps;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when caller is not the bound series
    error OnlySeries();

    /// @notice Error thrown when asset is not whitelisted
    /// @param assetContract Address of the asset contract
    error AssetNotWhitelisted(address assetContract);

    /// @notice Error thrown when prize pool is empty or insufficient
    error InsufficientPrizePool();

    /// @notice Error thrown when asset type is already registered
    error AssetTypeAlreadyRegistered();

    /// @notice Error thrown when asset type is not registered
    error AssetTypeNotRegistered();

    /// @notice Error thrown when asset type is invalid for the operation
    error InvalidAssetType();

    /// @notice Error thrown when no valid asset types available
    error NoValidAssetTypes();

    /// @notice Error thrown when insufficient ERC20 balance
    error InsufficientERC20();

    /// @notice Error thrown when no ERC721 tokens available
    error NoERC721Available();

    /// @notice Error thrown when no ERC1155 tokens available
    error NoERC1155Available();

    /// @notice Error thrown when no balance available for ERC1155 tokenId
    error NoERC1155Balance();

    /// @notice Error thrown when caller is not authorized to update pool configuration
    error UnauthorizedConfigUpdate();

    /// @notice Error thrown when caller is not authorized to deposit to the pool
    error UnauthorizedDeposit();

    /// @notice Error thrown when trying to remove an already-whitelisted asset (monotonic whitelist)
    error CannotUnwhitelist();

    /// @notice Error thrown when a token transfer results in zero assets received
    error ZeroAssetsReceived();

    /// @notice Error thrown when asset config is invalid
    error InvalidAssetShareBps(uint16 maxShareBps);

    /// @notice Error thrown when trying to edit asset config after initialization
    error AssetConfigImmutable(address assetContract);

    /// @notice Error thrown when trying to add new asset types after the first purchase
    error SeriesAssetSetLocked();

    /// @notice Error thrown when max asset types per opening is zero
    error InvalidMaxAssetTypesPerOpening();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when assets are deposited to the prize pool
    /// @param depositor Address depositing the assets
    /// @param assetType Type of asset (0=ERC20, 1=ERC721, 2=ERC1155)
    /// @param assetContract Contract address of the asset
    /// @param tokenId Token ID for NFTs (0 for ERC20)
    /// @param amount Amount deposited
    event AssetsDeposited(
        address indexed depositor, uint8 assetType, address indexed assetContract, uint256 tokenId, uint256 amount
    );

    /// @notice Emitted when asset whitelist status changes
    /// @param asset Address of the asset
    /// @param status New whitelist status
    event AssetWhitelisted(address indexed asset, bool status);

    /// @notice Emitted when immutable asset config is initialized
    /// @param asset Address of the asset
    /// @param maxShareBps Max share consumable in one claim, in basis points
    event AssetConfigInitialized(address indexed asset, uint16 maxShareBps);

    /// @notice Emitted when asset balance is manually synced
    /// @param asset Address of the asset
    /// @param newBalance Updated balance
    event AssetBalanceSynced(address indexed asset, uint256 newBalance);

    /// @notice Emitted when an NFT token-level balance is manually synced
    /// @param asset Address of the NFT contract
    /// @param assetType Type of asset (1=ERC721, 2=ERC1155)
    /// @param tokenId Token ID being synced
    /// @param newBalance Updated balance for the tokenId (1/0 for ERC721)
    event AssetTokenBalanceSynced(address indexed asset, uint8 assetType, uint256 indexed tokenId, uint256 newBalance);

    /// @notice Emitted when an asset type is removed from registry
    /// @param asset Address of the removed asset
    event AssetTypeRemoved(address indexed asset);

    /// @notice Emitted when leftover assets are swept out of the pool
    /// @param recipient Address receiving the leftovers
    /// @param assetType Type of asset (0=ERC20, 1=ERC721, 2=ERC1155)
    /// @param assetContract Contract address of the asset
    /// @param tokenId Token ID for NFTs (0 for ERC20)
    /// @param amount Amount transferred (1 for ERC721)
    event LeftoverSwept(
        address indexed recipient, uint8 assetType, address indexed assetContract, uint256 tokenId, uint256 amount
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Deposit ERC20 tokens to the prize pool
    /// @param tokenContract Address of the ERC20 token
    /// @param amount Amount to deposit
    function depositERC20(address tokenContract, uint256 amount) external;

    /// @notice Deposit ERC721 NFT to the prize pool
    /// @param tokenContract Address of the ERC721 contract
    /// @param tokenId Token ID to deposit
    function depositERC721(address tokenContract, uint256 tokenId) external;

    /// @notice Deposit ERC1155 tokens to the prize pool
    /// @param tokenContract Address of the ERC1155 contract
    /// @param tokenId Token ID to deposit
    /// @param amount Amount to deposit
    function depositERC1155(address tokenContract, uint256 tokenId, uint256 amount) external;

    /// @notice Initialize immutable config for a whitelisted asset before the first purchase
    /// @param asset Address of the asset
    /// @param status Must be true; assets cannot be removed once initialized
    /// @param maxShareBps Max share consumable in one claim, in basis points
    function whitelistAsset(address asset, bool status, uint16 maxShareBps) external;

    /// @notice Sync FT (fungible token) balance from contract
    /// @dev Queries actual balanceOf and updates internal state
    /// @param tokenContract Address of the ERC20 token
    function syncFTBalance(address tokenContract) external;

    /// @notice Sync NFT balance from contract (ERC721 or ERC1155)
    /// @dev Queries actual owner/balance and reconciles with internal state
    /// @param nftContract Address of the NFT contract
    /// @param tokenIds Array of token IDs to sync
    function syncNFTBalance(address nftContract, uint256[] calldata tokenIds) external;

    /// @notice Distribute prizes to recipient
    /// @dev Returns between 1 and `maxAssetTypesPerOpening()` distinct asset types per opening
    /// @param recipient Address to receive the prizes
    /// @param randomSeed Random seed for selection
    /// @return prizes Array of distributed prize assets
    function distributePrize(
        address recipient,
        uint256 randomSeed
    )
        external
        returns (IJunkyardSeries.PoolAsset[] memory prizes);

    /// @notice Sweep all remaining assets to a recipient
    /// @dev Intended for series-level leftover handling after a series ends
    /// @param recipient Address receiving all remaining assets
    function sweepAll(address recipient) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the number of valid asset types
    /// @return count Number of asset types with balance > 0
    function getPoolSize() external view returns (uint256 count);

    /// @notice Get all registered asset types
    /// @return Asset type array
    function getAssetTypes() external view returns (AssetType[] memory);

    /// @notice Get immutable config for a whitelisted asset
    /// @param asset Address of the asset
    /// @return configured Whether config exists
    /// @return maxShareBps Max share consumable in one claim, in basis points
    function getAssetConfig(address asset) external view returns (bool configured, uint16 maxShareBps);

    /// @notice Check if an asset is whitelisted
    /// @param asset Address of the asset
    /// @return whitelisted True if whitelisted
    function isAssetWhitelisted(address asset) external view returns (bool whitelisted);

    /// @notice Maximum number of distinct asset types one opening can distribute
    function maxAssetTypesPerOpening() external view returns (uint8);

    /// @notice Get the bound series address
    /// @return seriesAddress Address of the series
    function series() external view returns (address seriesAddress);
}
