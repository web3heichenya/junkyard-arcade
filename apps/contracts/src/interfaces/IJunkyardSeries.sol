// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IConfigGuard} from "./IConfigGuard.sol";
import {IBuyGuard} from "./IBuyGuard.sol";

/// @title IJunkyardSeries
/// @notice Interface for a blind box series contract
/// @dev Each series manages its own prize pool, configuration, and sales
interface IJunkyardSeries {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      DATA STRUCTURES                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Asset type enumeration
    enum AssetType {
        ERC20,
        ERC721,
        ERC1155
    }

    /// @notice Leftover prize handling policy for assets remaining after series ends
    enum LeftoverMode {
        RETURN, // return to leftoverRecipient (or creator if unset)
        DONATE, // donate to leftoverRecipient
        BURN // send to a burn address

    }

    /// @notice Configuration for the series
    struct SeriesConfig {
        address creator;
        uint256 price;
        address paymentToken;
        uint256 maxSupply;
        uint256 startTime;
        uint256 endTime;
        address configGuard;
        address buyGuard;
        address oracle;
    }

    /// @notice Prize pool asset entry
    struct PoolAsset {
        AssetType assetType;
        address assetContract;
        uint256 tokenId; // For ERC721/ERC1155
        uint256 amount; // For ERC20/ERC1155
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when series is not active for sales
    error SeriesNotActive();

    /// @notice Error thrown when series has ended
    error SeriesEnded();

    /// @notice Error thrown when series has not started yet
    /// @param startTime Start time of the series
    error SeriesNotStarted(uint256 startTime);

    /// @notice Error thrown when maximum supply is reached
    /// @param maxSupply Maximum supply of blind boxes
    error MaxSupplyReached(uint256 maxSupply);

    /// @notice Error thrown when insufficient payment is provided
    /// @param required Required payment amount
    /// @param provided Provided payment amount
    error InsufficientPayment(uint256 required, uint256 provided);

    /// @notice Error thrown when payment token does not match series configuration
    error InvalidPaymentToken();

    /// @notice Error thrown when a payment token delivers a different amount than expected
    /// @param expected Expected amount to be received by the series
    /// @param actual Actual amount received by the series
    error UnexpectedPaymentReceived(uint256 expected, uint256 actual);

    /// @notice Error thrown when insufficient native value is supplied for oracle direct funding
    /// @param required Required oracle fee for this request
    /// @param provided Native value supplied by the caller
    error InsufficientOracleFee(uint256 required, uint256 provided);

    /// @notice Error thrown when caller is not the blind box owner
    error NotBoxOwner();

    /// @notice Error thrown when blind box does not belong to this series
    error InvalidBoxSeries();

    /// @notice Error thrown when buyer is not authorized to purchase
    error UnauthorizedPurchase();

    /// @notice Error thrown when caller is not authorized to update config/policies
    error UnauthorizedConfigUpdate();

    /// @notice Error thrown when asset type is not whitelisted for this series
    /// @param assetContract Address of the asset contract
    error AssetNotWhitelisted(address assetContract);

    /// @notice Error thrown when prize pool is insufficient for distribution
    error InsufficientPrizePool();

    /// @notice Error thrown when refund fails
    error RefundFailed();

    /// @notice Error thrown when a blind box has already been opened
    /// @param boxId Token ID of the blind box
    error BlindBoxAlreadyOpened(uint256 boxId);

    /// @notice Error thrown when randomness is not yet fulfilled for a box
    /// @param requestId Randomness request ID
    error RandomnessNotFulfilled(bytes32 requestId);

    /// @notice Error thrown when a box was not opened (no randomness request)
    /// @param boxId Token ID of the blind box
    error BlindBoxNotOpened(uint256 boxId);

    /// @notice Error thrown when native token payout fails
    error PayoutFailed();

    /// @notice Error thrown when a config update is not allowed under the current lock rules
    error ConfigUpdateNotAllowed();

    /// @notice Error thrown when trying to sweep leftovers before the series ends
    error SeriesNotEnded();

    /// @notice Error thrown when trying to sweep leftovers before all purchased boxes are claimed
    /// @param totalPurchased Total boxes purchased
    /// @param totalClaimed Total boxes claimed
    error NotAllClaimed(uint256 totalPurchased, uint256 totalClaimed);

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

    /// @notice Emitted when a blind box is purchased
    /// @param buyer Address purchasing the box
    /// @param boxId Token ID of the blind box NFT
    /// @param price Price paid
    event BlindBoxPurchased(address indexed buyer, uint256 indexed boxId, uint256 price);

    /// @notice Emitted when a blind box is opened
    /// @param opener Address opening the box
    /// @param boxId Token ID of the blind box NFT
    /// @param requestId Randomness request ID
    /// @param oracleFeePaid Native token amount paid to the randomness provider
    event BlindBoxOpened(address indexed opener, uint256 indexed boxId, bytes32 requestId, uint256 oracleFeePaid);

    /// @notice Emitted when prizes are claimed
    /// @param claimer Address claiming prizes
    /// @param boxId Token ID of the blind box NFT
    event PrizesClaimed(address indexed claimer, uint256 indexed boxId);

    /// @notice Emitted for each prize distributed for a blind box
    /// @param recipient Address receiving the prize
    /// @param boxId Token ID of the blind box NFT
    /// @param assetType Type of asset (0=ERC20, 1=ERC721, 2=ERC1155)
    /// @param assetContract Contract address of the prize asset
    /// @param tokenId Token ID for NFTs (0 for ERC20)
    /// @param amount Amount for ERC20/ERC1155 (1 for ERC721)
    event PrizeDistributed(
        address indexed recipient,
        uint256 indexed boxId,
        uint8 assetType,
        address indexed assetContract,
        uint256 tokenId,
        uint256 amount
    );

    /// @notice Emitted when sale configuration is updated
    event SaleConfigUpdated(uint256 price, uint256 startTime, uint256 endTime, uint256 maxSupply);

    /// @notice Emitted when leftover policy is updated
    event LeftoverPolicyUpdated(uint8 mode, address indexed recipient);

    /// @notice Emitted when leftovers are swept
    event LeftoversSwept(address indexed recipient);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Purchase a blind box
    /// @dev Payment must match series configuration (native or ERC20)
    /// @return boxId Token ID of the purchased blind box NFT
    function purchase() external payable returns (uint256 boxId);

    /// @notice Open a blind box and request randomness
    /// @dev Only box owner can open, initiates VRF request
    /// @param boxId Token ID of the blind box to open
    function open(uint256 boxId) external payable;

    /// @notice Claim prizes after randomness is fulfilled
    /// @dev Distributes assets and burns the blind box NFT
    /// @param boxId Token ID of the blind box
    function claim(uint256 boxId) external;

    /// @notice Update sale-related config (with lock rules once purchases start)
    function updateSaleConfig(uint256 price, uint256 startTime, uint256 endTime, uint256 maxSupply) external;

    /// @notice Set leftover handling policy (monotonic tightening once purchases start)
    function setLeftoverPolicy(uint8 mode, address recipient) external;

    /// @notice Sweep remaining assets from prize pool according to leftover policy
    function sweepLeftovers() external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get series configuration
    /// @return creator Series creator address
    /// @return price Price per blind box
    /// @return paymentToken Payment token address (address(0) for native)
    /// @return maxSupply Maximum number of boxes
    /// @return startTime Sale start timestamp
    /// @return endTime Sale end timestamp (0 for unlimited)
    /// @return configGuard Config guard contract address
    /// @return buyGuard Buy guard contract address
    function getConfig()
        external
        view
        returns (
            address creator,
            uint256 price,
            address paymentToken,
            uint256 maxSupply,
            uint256 startTime,
            uint256 endTime,
            address configGuard,
            address buyGuard,
            address oracle
        );

    /// @notice Get series statistics
    /// @return totalPurchased Total number of boxes purchased
    /// @return totalOpened Total number of boxes opened
    /// @return totalClaimed Total number of boxes claimed
    function getStats() external view returns (uint256 totalPurchased, uint256 totalOpened, uint256 totalClaimed);

    /// @notice Get the number of purchases by an address
    /// @param buyer Address to query
    /// @return count Number of purchases
    function getPurchaseCount(address buyer) external view returns (uint256 count);

    /// @notice Whether series config has been locked (first purchase happened)
    function isConfigLocked() external view returns (bool locked);

    /// @notice Get leftover policy configuration
    function getLeftoverPolicy() external view returns (uint8 mode, address recipient);
}
