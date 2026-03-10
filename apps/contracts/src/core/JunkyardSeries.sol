// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IJunkyardSeries} from "../interfaces/IJunkyardSeries.sol";
import {IJunkyardNFT} from "../interfaces/IJunkyardNFT.sol";
import {IJunkyardPrizePool} from "../interfaces/IJunkyardPrizePool.sol";
import {IJunkyardGlobalConfig} from "../interfaces/IJunkyardGlobalConfig.sol";
import {IConfigGuard} from "../interfaces/IConfigGuard.sol";
import {IBuyGuard} from "../interfaces/IBuyGuard.sol";
import {IRandomnessProvider} from "../interfaces/IRandomnessProvider.sol";

/// @title JunkyardSeries
/// @notice Core contract for managing a blind box series
/// @dev This contract implements:
///      - Series configuration and lifecycle management
///      - Prize pool management for multiple asset types
///      - Blind box purchase and opening mechanics
///      - Guard-based access control
///      - Randomness-based prize distribution
/// @author Development Team
contract JunkyardSeries is IJunkyardSeries, Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Contract version for upgrade tracking
    string public constant VERSION = "1.0.0";

    /// @notice Series configuration
    IJunkyardSeries.SeriesConfig private _config;

    /// @notice Blind box NFT contract
    IJunkyardNFT private BLIND_BOX_NFT;

    /// @notice Global configuration contract (protocol fee, whitelists)
    IJunkyardGlobalConfig private GLOBAL_CONFIG;

    /// @notice Prize pool contract
    IJunkyardPrizePool public prizePool;

    /// @notice Series ID
    uint256 public SERIES_ID;

    /// @notice Total number of boxes purchased
    uint256 private _totalPurchased;

    /// @notice Total number of boxes opened
    uint256 private _totalOpened;

    /// @notice Total number of boxes claimed
    uint256 private _totalClaimed;

    /// @notice Purchase count per address
    mapping(address => uint256) private _purchaseCount;

    /// @notice Mapping from box ID to randomness request ID
    mapping(uint256 => bytes32) private _boxToRequest;

    /// @notice Mapping from request ID to box ID
    mapping(bytes32 => uint256) private _requestToBox;

    /// @notice Whether config is locked (first purchase happened)
    bool private _configLocked;

    /// @notice Leftover policy config
    LeftoverMode private _leftoverMode;
    address private _leftoverRecipient;

    /// @notice Burn address used for leftover burning
    address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    CONSTRUCTOR & INIT                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Disables initializers on the implementation contract
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize a new blind box series
    /// @param blindBoxNFT Blind box NFT contract address
    /// @param prizePoolAddress Prize pool contract address
    /// @param seriesId Unique identifier for this series
    /// @param creator Address of the series creator
    /// @param price Price per blind box
    /// @param paymentToken Payment token address (address(0) for native)
    /// @param maxSupply Maximum number of blind boxes
    /// @param startTime Sale start timestamp
    /// @param endTime Sale end timestamp (0 for unlimited)
    /// @param configGuard Config guard contract address
    /// @param buyGuard Buy guard contract address
    /// @param oracle Randomness provider contract address
    function initialize(
        address blindBoxNFT,
        address prizePoolAddress,
        uint256 seriesId,
        address creator,
        uint256 price,
        address paymentToken,
        uint256 maxSupply,
        uint256 startTime,
        uint256 endTime,
        address configGuard,
        address buyGuard,
        address oracle,
        address globalConfig
    )
        external
        initializer
    {
        __ReentrancyGuard_init();

        BLIND_BOX_NFT = IJunkyardNFT(blindBoxNFT);
        prizePool = IJunkyardPrizePool(prizePoolAddress);
        SERIES_ID = seriesId;
        GLOBAL_CONFIG = IJunkyardGlobalConfig(globalConfig);

        _config = SeriesConfig({
            creator: creator,
            price: price,
            paymentToken: paymentToken,
            maxSupply: maxSupply,
            startTime: startTime,
            endTime: endTime,
            configGuard: configGuard,
            buyGuard: buyGuard,
            oracle: oracle
        });

        // Default leftover policy: return to creator.
        _leftoverMode = LeftoverMode.RETURN;
        _leftoverRecipient = creator;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Purchase a blind box
    /// @dev Payment must match series configuration (native or ERC20)
    /// @return boxId Token ID of the purchased blind box NFT
    function purchase() external payable nonReentrant returns (uint256 boxId) {
        // Require at least one prize type in the pool to reduce "sold but cannot claim" risk.
        if (prizePool.getPoolSize() == 0) {
            revert InsufficientPrizePool();
        }

        // Check sale timing
        if (block.timestamp < _config.startTime) {
            revert SeriesNotStarted(_config.startTime);
        }
        if (_config.endTime != 0 && block.timestamp > _config.endTime) {
            revert SeriesEnded();
        }

        // Check supply limit
        if (_totalPurchased >= _config.maxSupply) {
            revert MaxSupplyReached(_config.maxSupply);
        }

        // Check buy guard permission
        if (_config.buyGuard != address(0)) {
            uint256 nextPurchaseCount = _purchaseCount[msg.sender] + 1;
            bool authorized = IBuyGuard(_config.buyGuard).checkBuy(msg.sender, nextPurchaseCount, _config.creator);
            if (!authorized) {
                revert UnauthorizedPurchase();
            }
        }

        // Handle payment (and pay out protocol fee + creator proceeds)
        (uint256 feeBps, address feeRecipient) = GLOBAL_CONFIG.getProtocolFee();
        uint256 protocolFee = (_config.price * feeBps) / 10_000;
        uint256 creatorProceeds = _config.price - protocolFee;

        if (_config.paymentToken == address(0)) {
            // Native token payment
            if (msg.value < _config.price) {
                revert InsufficientPayment(_config.price, msg.value);
            }
            // Refund excess payment
            if (msg.value > _config.price) {
                (bool success,) = payable(msg.sender).call{value: msg.value - _config.price}("");
                if (!success) {
                    revert RefundFailed();
                }
            }

            // Payout protocol fee + creator proceeds
            if (protocolFee > 0) {
                (bool feeOk,) = payable(feeRecipient).call{value: protocolFee}("");
                if (!feeOk) revert PayoutFailed();
            }
            if (creatorProceeds > 0) {
                (bool creatorOk,) = payable(_config.creator).call{value: creatorProceeds}("");
                if (!creatorOk) revert PayoutFailed();
            }
        } else {
            // ERC20 payment
            if (msg.value != 0) {
                revert InvalidPaymentToken();
            }
            uint256 balanceBefore = IERC20(_config.paymentToken).balanceOf(address(this));
            IERC20(_config.paymentToken).safeTransferFrom(msg.sender, address(this), _config.price);
            uint256 received = IERC20(_config.paymentToken).balanceOf(address(this)) - balanceBefore;
            if (received != _config.price) {
                revert UnexpectedPaymentReceived(_config.price, received);
            }

            if (protocolFee > 0) {
                IERC20(_config.paymentToken).safeTransfer(feeRecipient, protocolFee);
            }
            if (creatorProceeds > 0) {
                IERC20(_config.paymentToken).safeTransfer(_config.creator, creatorProceeds);
            }
        }

        // Mint blind box NFT
        boxId = BLIND_BOX_NFT.mint(msg.sender);

        // Update statistics
        unchecked {
            ++_totalPurchased;
            ++_purchaseCount[msg.sender];
        }
        if (!_configLocked) _configLocked = true;

        emit BlindBoxPurchased(msg.sender, boxId, _config.price);
    }

    /// @notice Open a blind box and request randomness
    /// @dev Only box owner can open, initiates VRF request
    /// @param boxId Token ID of the blind box to open
    function open(uint256 boxId) external payable nonReentrant {
        // Prevent opening when there are no prizes to distribute.
        if (prizePool.getPoolSize() == 0) {
            revert InsufficientPrizePool();
        }

        // Verify box ownership
        if (BLIND_BOX_NFT.ownerOf(boxId) != msg.sender) {
            revert NotBoxOwner();
        }

        // Prevent reopening the same box
        if (_boxToRequest[boxId] != bytes32(0)) {
            revert BlindBoxAlreadyOpened(boxId);
        }

        // Note: Box always belongs to this series (series-specific NFT)

        // Request randomness from oracle
        IRandomnessProvider oracle = IRandomnessProvider(_config.oracle);
        uint256 oracleFee = oracle.getRequestPrice();
        if (msg.value < oracleFee) {
            revert InsufficientOracleFee(oracleFee, msg.value);
        }

        bytes32 requestId = oracle.requestRandomness{value: oracleFee}();
        if (requestId == bytes32(0)) {
            revert InsufficientPrizePool();
        }

        // Store mapping between box and request
        _boxToRequest[boxId] = requestId;
        _requestToBox[requestId] = boxId;

        // Update statistics
        unchecked {
            ++_totalOpened;
        }

        if (msg.value > oracleFee) {
            (bool success,) = payable(msg.sender).call{value: msg.value - oracleFee}("");
            if (!success) {
                revert RefundFailed();
            }
        }

        emit BlindBoxOpened(msg.sender, boxId, requestId, oracleFee);
    }

    /// @notice Claim prizes after randomness is fulfilled
    /// @dev Distributes assets and burns the blind box NFT
    /// @param boxId Token ID of the blind box
    function claim(uint256 boxId) external nonReentrant {
        // Verify box ownership
        address boxOwner = BLIND_BOX_NFT.ownerOf(boxId);
        if (boxOwner != msg.sender) {
            revert NotBoxOwner();
        }

        // Get randomness request ID
        bytes32 requestId = _boxToRequest[boxId];
        if (requestId == bytes32(0)) {
            revert BlindBoxNotOpened(boxId);
        }

        // Get randomness from oracle
        IRandomnessProvider oracle = IRandomnessProvider(_config.oracle);
        if (!oracle.isFulfilled(requestId)) {
            revert RandomnessNotFulfilled(requestId);
        }
        uint256 randomness = oracle.getRandomness(requestId);

        // Distribute prizes based on randomness
        IJunkyardSeries.PoolAsset[] memory prizes = _distributePrizes(boxOwner, randomness);
        for (uint256 i = 0; i < prizes.length; i++) {
            IJunkyardSeries.PoolAsset memory p = prizes[i];
            emit PrizeDistributed(boxOwner, boxId, uint8(p.assetType), p.assetContract, p.tokenId, p.amount);
        }

        // Burn the blind box NFT
        BLIND_BOX_NFT.burn(boxId);

        // Clean up mappings
        delete _boxToRequest[boxId];
        delete _requestToBox[requestId];

        // Update statistics
        unchecked {
            ++_totalClaimed;
        }

        emit PrizesClaimed(msg.sender, boxId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ADMIN FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier onlyConfigUpdater() {
        address creator = _config.creator;
        address configGuard = _config.configGuard;

        if (configGuard == address(0)) {
            if (msg.sender != creator) revert UnauthorizedConfigUpdate();
            _;
            return;
        }

        bool ok = IConfigGuard(configGuard).checkConfigUpdate(msg.sender, creator);
        if (!ok) revert UnauthorizedConfigUpdate();
        _;
    }

    /// @notice Update sale configuration
    /// @dev After the first purchase, only tightening updates are allowed:
    ///      - price/startTime cannot change
    ///      - maxSupply can only decrease (but not below totalPurchased)
    ///      - endTime can only decrease, or be set from 0->nonzero
    function updateSaleConfig(
        uint256 price,
        uint256 startTime,
        uint256 endTime,
        uint256 maxSupply
    )
        external
        onlyConfigUpdater
    {
        SeriesConfig memory oldC = _config;

        if (maxSupply < _totalPurchased) revert ConfigUpdateNotAllowed();

        if (_configLocked) {
            if (price != oldC.price) revert ConfigUpdateNotAllowed();
            if (startTime != oldC.startTime) revert ConfigUpdateNotAllowed();

            if (maxSupply > oldC.maxSupply) revert ConfigUpdateNotAllowed();

            // Tighten endTime:
            // - if old endTime is 0 (unlimited), allow keeping it (0) or setting a finite endTime
            // - otherwise allow decreasing only
            if (oldC.endTime == 0) {
                // keep 0 (no end) or set finite endTime
            } else {
                if (endTime == 0) revert ConfigUpdateNotAllowed();
                if (endTime > oldC.endTime) revert ConfigUpdateNotAllowed();
            }
        }

        _config.price = price;
        _config.startTime = startTime;
        _config.endTime = endTime;
        _config.maxSupply = maxSupply;

        emit SaleConfigUpdated(price, startTime, endTime, maxSupply);
    }

    /// @notice Set leftover handling policy
    /// @dev After first purchase, policy can only be tightened:
    ///      RETURN -> DONATE -> BURN
    function setLeftoverPolicy(uint8 mode, address recipient) external onlyConfigUpdater {
        if (mode > uint8(LeftoverMode.BURN)) revert ConfigUpdateNotAllowed();
        LeftoverMode next = LeftoverMode(mode);

        if (_configLocked) {
            LeftoverMode cur = _leftoverMode;
            if (cur == LeftoverMode.BURN) revert ConfigUpdateNotAllowed();
            if (cur == LeftoverMode.DONATE && next != LeftoverMode.BURN) {
                revert ConfigUpdateNotAllowed();
            }
            if (cur == LeftoverMode.RETURN && next == LeftoverMode.RETURN) {
                // Recipient is locked once purchases start to avoid surprising changes.
                if (recipient != _leftoverRecipient) revert ConfigUpdateNotAllowed();
            }
            if (cur == LeftoverMode.DONATE && next == LeftoverMode.DONATE) {
                if (recipient != _leftoverRecipient) revert ConfigUpdateNotAllowed();
            }
            if (cur == LeftoverMode.RETURN && next == LeftoverMode.DONATE) {
                // allow choosing recipient on tightening step
            }
        }

        if (next == LeftoverMode.DONATE && recipient == address(0)) {
            revert ConfigUpdateNotAllowed();
        }

        _leftoverMode = next;
        address actualRecipient;
        if (next == LeftoverMode.BURN) {
            actualRecipient = BURN_ADDRESS;
        } else {
            _leftoverRecipient = recipient == address(0) ? _config.creator : recipient;
            actualRecipient = _leftoverRecipient;
        }

        emit LeftoverPolicyUpdated(mode, actualRecipient);
    }

    /// @notice Sweep remaining assets from prize pool according to leftover policy
    function sweepLeftovers() external onlyConfigUpdater nonReentrant {
        // Must be ended by time (if set) or sold out.
        bool endedByTime = _config.endTime != 0 && block.timestamp > _config.endTime;
        bool soldOut = _totalPurchased >= _config.maxSupply;
        if (!endedByTime && !soldOut) revert SeriesNotEnded();

        if (_totalClaimed != _totalPurchased) {
            revert NotAllClaimed(_totalPurchased, _totalClaimed);
        }

        address recipient;
        if (_leftoverMode == LeftoverMode.BURN) {
            recipient = BURN_ADDRESS;
        } else if (_leftoverRecipient != address(0)) {
            recipient = _leftoverRecipient;
        } else {
            recipient = _config.creator;
        }

        prizePool.sweepAll(recipient);
        emit LeftoversSwept(recipient);
    }

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
        )
    {
        SeriesConfig memory config = _config;
        return (
            config.creator,
            config.price,
            config.paymentToken,
            config.maxSupply,
            config.startTime,
            config.endTime,
            config.configGuard,
            config.buyGuard,
            config.oracle
        );
    }

    /// @notice Get series statistics
    /// @return totalPurchased Total number of boxes purchased
    /// @return totalOpened Total number of boxes opened
    /// @return totalClaimed Total number of boxes claimed
    function getStats() external view returns (uint256 totalPurchased, uint256 totalOpened, uint256 totalClaimed) {
        return (_totalPurchased, _totalOpened, _totalClaimed);
    }

    /// @notice Get the number of purchases by an address
    /// @param buyer Address to query
    /// @return count Number of purchases
    function getPurchaseCount(address buyer) external view returns (uint256 count) {
        return _purchaseCount[buyer];
    }

    function isConfigLocked() external view returns (bool locked) {
        return _configLocked;
    }

    function getLeftoverPolicy() external view returns (uint8 mode, address recipient) {
        if (_leftoverMode == LeftoverMode.BURN) {
            return (uint8(_leftoverMode), BURN_ADDRESS);
        }
        return (uint8(_leftoverMode), _leftoverRecipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Distribute prizes to box opener based on randomness
    /// @dev Delegates to the prize pool, which returns between 1 and its configured max distinct asset types
    /// @param recipient Address to receive prizes
    /// @param randomness Random number from VRF
    /// @notice Distribute prizes from the prize pool
    function _distributePrizes(
        address recipient,
        uint256 randomness
    )
        internal
        returns (IJunkyardSeries.PoolAsset[] memory prizes)
    {
        // Get prizes from pool (1-5 different types)
        prizes = prizePool.distributePrize(recipient, randomness);
    }
}
