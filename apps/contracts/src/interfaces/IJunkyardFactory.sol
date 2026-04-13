// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IJunkyardFactory
/// @notice Interface for the Series Factory contract with CREATE2 deployment
/// @dev Responsible for deploying new blind box series with predictable addresses
interface IJunkyardFactory {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      DATA STRUCTURES                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Addresses for a series
    struct SeriesAddresses {
        address series;
        address nft;
        address prizePool;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when oracle is not whitelisted
    error OracleNotWhitelisted();

    /// @notice Error thrown when payment token is not whitelisted
    error PaymentTokenNotWhitelisted();

    /// @notice Error thrown when guard is not whitelisted
    error GuardNotWhitelisted();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a new series is created
    /// @param seriesId ID of the new series
    /// @param nftCollection Address of the NFT collection contract
    /// @param seriesAddress Address of the deployed series contract
    /// @param prizePoolAddress Address of the deployed prize pool contract
    /// @param creator Address of the series creator
    /// @param price Price per blind box
    /// @param paymentToken Payment token address (address(0) for native)
    /// @param maxSupply Maximum number of blind boxes
    /// @param startTime Sale start timestamp
    /// @param endTime Sale end timestamp (0 for unlimited)
    /// @param configGuard Config guard contract address
    /// @param buyGuard Buy guard contract address
    /// @param oracle Randomness provider contract address
    /// @param maxAssetTypesPerOpening Max number of distinct asset types one opening can distribute
    event SeriesCreated(
        uint256 indexed seriesId,
        address indexed nftCollection,
        address indexed seriesAddress,
        address prizePoolAddress,
        address creator,
        uint256 price,
        address paymentToken,
        uint256 maxSupply,
        uint256 startTime,
        uint256 endTime,
        address configGuard,
        address buyGuard,
        address oracle,
        uint8 maxAssetTypesPerOpening
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Create a new blind box series with deterministic addresses
    /// @param nftName Name of the NFT collection
    /// @param nftSymbol Symbol of the NFT collection
    /// @param price Price per blind box
    /// @param paymentToken Payment token address (address(0) for native)
    /// @param maxSupply Maximum number of blind boxes
    /// @param startTime Sale start timestamp
    /// @param endTime Sale end timestamp (0 for unlimited)
    /// @param configGuard Config guard contract address
    /// @param buyGuard Buy guard contract address
    /// @param oracle Randomness provider contract address
    /// @param maxAssetTypesPerOpening Max number of distinct asset types one opening can distribute
    /// @return seriesId ID of the new series
    function createSeries(
        string memory nftName,
        string memory nftSymbol,
        uint256 price,
        address paymentToken,
        uint256 maxSupply,
        uint256 startTime,
        uint256 endTime,
        address configGuard,
        address buyGuard,
        address oracle,
        uint8 maxAssetTypesPerOpening
    )
        external
        returns (uint256 seriesId);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get all addresses for a series
    /// @param seriesId ID of the series
    /// @return addresses Struct containing series, NFT, and prize pool addresses
    function getSeriesAddresses(uint256 seriesId) external view returns (SeriesAddresses memory addresses);

    /// @notice Get total number of series created
    /// @return count Total series count
    function getSeriesCount() external view returns (uint256 count);

    /// @notice Get series created by an address
    /// @param creator Address of the creator
    /// @return seriesIds Array of series IDs created by this address
    function getSeriesByCreator(address creator) external view returns (uint256[] memory seriesIds);

    /// @notice Compute the future addresses for a series before creation
    /// @param creator Address of the creator
    /// @param seriesId Series ID (use getSeriesCount() + 1 for next)
    /// @return addresses Predicted addresses for series, NFT, and prize pool
    function computeAddresses(
        address creator,
        uint256 seriesId
    )
        external
        view
        returns (SeriesAddresses memory addresses);
}
