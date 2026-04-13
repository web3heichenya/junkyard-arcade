// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IJunkyardFactory} from "../interfaces/IJunkyardFactory.sol";
import {IJunkyardGlobalConfig} from "../interfaces/IJunkyardGlobalConfig.sol";
import {JunkyardSeries} from "./JunkyardSeries.sol";
import {JunkyardNFT} from "./JunkyardNFT.sol";
import {JunkyardPrizePool} from "./JunkyardPrizePool.sol";

/// @title JunkyardFactory
/// @notice Factory contract for deploying new blind box series with CREATE2
/// @dev This contract implements:
///      - Series deployment using CREATE2 for predictable addresses
///      - NFT collection deployment per series
///      - Series tracking and indexing
/// @author Development Team
contract JunkyardFactory is IJunkyardFactory, Ownable {
    using Clones for address;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Global configuration contract
    IJunkyardGlobalConfig private immutable GLOBAL_CONFIG;

    /// @notice Next series ID
    uint256 private _nextSeriesId;

    /// @notice Mapping from series ID to series addresses
    mapping(uint256 => IJunkyardFactory.SeriesAddresses) private _seriesInfo;

    /// @notice Mapping from creator address to their series IDs
    mapping(address => uint256[]) private _creatorSeries;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the JunkyardFactory
    /// @param globalConfig Address of the global configuration contract
    /// @param initialOwner Address of the contract owner
    constructor(address globalConfig, address initialOwner) Ownable(initialOwner) {
        GLOBAL_CONFIG = IJunkyardGlobalConfig(globalConfig);
        _nextSeriesId = 1; // Start series IDs from 1
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Create a new blind box series with deterministic addresses
    /// @param nftName Name of the NFT collection
    /// @param nftSymbol Symbol of the NFT collection
    /// @param price Price per blind box
    /// @param paymentToken Token for payment (address(0) for native)
    /// @param maxSupply Maximum number of blind boxes
    /// @param startTime Start time for sales
    /// @param endTime End time for sales (0 for no end)
    /// @param configGuard Guard for config updates (address(0) for none)
    /// @param buyGuard Guard for purchases (address(0) for none)
    /// @param oracle Randomness oracle address
    /// @param maxAssetTypesPerOpening Max number of distinct asset types one opening can distribute
    /// @return seriesId ID of the created series
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
        returns (uint256 seriesId)
    {
        // Validate payment token whitelist
        if (!GLOBAL_CONFIG.isPaymentTokenWhitelisted(paymentToken)) {
            revert PaymentTokenNotWhitelisted();
        }

        // Validate oracle whitelist
        if (!GLOBAL_CONFIG.isOracleWhitelisted(oracle)) {
            revert OracleNotWhitelisted();
        }

        // Validate guards whitelist (if provided)
        if (configGuard != address(0) && !GLOBAL_CONFIG.isGuardWhitelisted(configGuard)) {
            revert GuardNotWhitelisted();
        }
        if (buyGuard != address(0) && !GLOBAL_CONFIG.isGuardWhitelisted(buyGuard)) {
            revert GuardNotWhitelisted();
        }

        // Get next series ID
        seriesId = _nextSeriesId;
        unchecked {
            ++_nextSeriesId;
        }

        // Generate salt for CREATE2
        bytes32 salt = _generateSalt(msg.sender, seriesId);

        // Get current implementations from JunkyardGlobalConfig
        address seriesImpl = GLOBAL_CONFIG.seriesImplementation();
        address nftImpl = GLOBAL_CONFIG.nftImplementation();
        address poolImpl = GLOBAL_CONFIG.prizePoolImplementation();

        // Deploy all three contracts using Clones with CREATE2
        address seriesAddress = Clones.cloneDeterministic(seriesImpl, salt);
        address nftCollection = Clones.cloneDeterministic(nftImpl, salt);
        address prizePoolAddress = Clones.cloneDeterministic(poolImpl, salt);

        // Initialize the NFT collection
        JunkyardNFT(nftCollection).initialize(nftName, nftSymbol, seriesAddress, address(this));

        // Initialize prize pool
        JunkyardPrizePool(prizePoolAddress).initialize(seriesAddress, maxAssetTypesPerOpening);

        // Initialize series
        JunkyardSeries(payable(seriesAddress)).initialize(
            nftCollection,
            prizePoolAddress,
            seriesId,
            msg.sender, // creator
            price,
            paymentToken,
            maxSupply,
            startTime,
            endTime,
            configGuard,
            buyGuard,
            oracle,
            address(GLOBAL_CONFIG)
        );

        // Transfer NFT ownership to series contract
        JunkyardNFT(nftCollection).transferOwnership(seriesAddress);

        // Register series
        _seriesInfo[seriesId] =
            IJunkyardFactory.SeriesAddresses({series: seriesAddress, nft: nftCollection, prizePool: prizePoolAddress});
        _creatorSeries[msg.sender].push(seriesId);

        emit SeriesCreated(
            seriesId,
            nftCollection,
            seriesAddress,
            prizePoolAddress,
            msg.sender,
            price,
            paymentToken,
            maxSupply,
            startTime,
            endTime,
            configGuard,
            buyGuard,
            oracle,
            maxAssetTypesPerOpening
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get all addresses for a series
    /// @param seriesId ID of the series
    /// @return addresses Struct containing series, NFT, and prize pool addresses
    function getSeriesAddresses(uint256 seriesId) external view returns (SeriesAddresses memory addresses) {
        return _seriesInfo[seriesId];
    }

    /// @notice Get total number of series created
    /// @return count Total series count
    function getSeriesCount() external view returns (uint256 count) {
        unchecked {
            return _nextSeriesId - 1;
        }
    }

    /// @notice Get series created by an address
    /// @param creator Address of the creator
    /// @return seriesIds Array of series IDs created by this address
    function getSeriesByCreator(address creator) external view returns (uint256[] memory seriesIds) {
        return _creatorSeries[creator];
    }

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
        returns (SeriesAddresses memory addresses)
    {
        bytes32 salt = _generateSalt(creator, seriesId);

        // Get current implementations from JunkyardGlobalConfig
        address seriesImpl = GLOBAL_CONFIG.seriesImplementation();
        address nftImpl = GLOBAL_CONFIG.nftImplementation();
        address poolImpl = GLOBAL_CONFIG.prizePoolImplementation();

        // Predict addresses using Clones.predictDeterministicAddress
        addresses.series = Clones.predictDeterministicAddress(seriesImpl, salt, address(this));
        addresses.nft = Clones.predictDeterministicAddress(nftImpl, salt, address(this));
        addresses.prizePool = Clones.predictDeterministicAddress(poolImpl, salt, address(this));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Generate salt for CREATE2 deployment
    /// @param creator Address of the creator
    /// @param seriesId Series ID
    /// @return salt Computed salt
    function _generateSalt(address creator, uint256 seriesId) internal pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked(creator, seriesId));
    }
}
