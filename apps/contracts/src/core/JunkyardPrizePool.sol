// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IJunkyardPrizePool} from "../interfaces/IJunkyardPrizePool.sol";
import {IJunkyardSeries} from "../interfaces/IJunkyardSeries.sol";
import {IConfigGuard} from "../interfaces/IConfigGuard.sol";

/// @title JunkyardPrizePool
/// @notice Prize pool management contract for a series
/// @dev Manages asset deposits and distribution
/// @author Development Team
contract JunkyardPrizePool is IJunkyardPrizePool, Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Contract version for upgrade tracking
    string public constant VERSION = "1.0.0";

    /// @notice The series contract bound to this pool
    address public series;

    /// @notice Maximum number of distinct asset types one opening can distribute
    uint8 public maxAssetTypesPerOpening;

    /// @notice Asset type registry
    AssetType[] private _assetTypes;

    /// @notice Mapping from asset contract to type index (+1)
    mapping(address => uint256) private _assetTypeIndex;

    /// @notice Asset whitelist
    mapping(address => bool) private _whitelistedAssets;

    /// @notice Immutable per-asset max share in basis points
    mapping(address => uint16) private _assetMaxShareBps;

    /// @notice Whether an asset config has been initialized
    mapping(address => bool) private _assetConfigured;

    /// @notice ERC20 balances by contract
    mapping(address => uint256) private _erc20Balances;

    /// @notice ERC721 tokens by contract
    mapping(address => uint256[]) private _erc721Tokens;

    /// @notice ERC1155 balances: contract => tokenId => amount
    mapping(address => mapping(uint256 => uint256)) private _erc1155Balances;

    /// @notice ERC1155 tokenId tracking by contract
    mapping(address => uint256[]) private _erc1155TokenIds;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MODIFIERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Only allow calls from the bound series contract
    modifier onlySeries() {
        if (msg.sender != series) {
            revert OnlySeries();
        }
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Disable initializers for implementation contract
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the prize pool
    /// @param seriesAddress Address of the bound series contract
    /// @param maxAssetTypesPerOpening_ Max number of distinct asset types one opening can distribute
    function initialize(address seriesAddress, uint8 maxAssetTypesPerOpening_) external initializer {
        __ReentrancyGuard_init();
        if (maxAssetTypesPerOpening_ == 0) {
            revert InvalidMaxAssetTypesPerOpening();
        }
        series = seriesAddress;
        maxAssetTypesPerOpening = maxAssetTypesPerOpening_;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Deposit ERC20 tokens to the prize pool
    /// @param tokenContract Address of the ERC20 token
    /// @param amount Amount to deposit
    function depositERC20(address tokenContract, uint256 amount) external nonReentrant {
        _requireDepositAuthorized(msg.sender);
        if (!_whitelistedAssets[tokenContract]) {
            revert AssetNotWhitelisted(tokenContract);
        }

        uint256 balanceBefore = IERC20(tokenContract).balanceOf(address(this));
        IERC20(tokenContract).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(tokenContract).balanceOf(address(this)) - balanceBefore;
        if (received == 0) {
            revert ZeroAssetsReceived();
        }

        // Register asset type if first time
        if (_assetTypeIndex[tokenContract] == 0) {
            _registerAssetType(tokenContract, IJunkyardSeries.AssetType.ERC20);
        }

        // Update balance using actual received amount to support fee-on-transfer tokens safely.
        _erc20Balances[tokenContract] += received;
        uint256 newBalance = _erc20Balances[tokenContract];
        _updateAssetTypeBalance(tokenContract, newBalance);

        emit AssetsDeposited(msg.sender, uint8(IJunkyardSeries.AssetType.ERC20), tokenContract, 0, received);
    }

    /// @notice Deposit ERC721 NFT to the prize pool
    /// @param tokenContract Address of the ERC721 contract
    /// @param tokenId Token ID to deposit
    function depositERC721(address tokenContract, uint256 tokenId) external nonReentrant {
        _requireDepositAuthorized(msg.sender);
        if (!_whitelistedAssets[tokenContract]) {
            revert AssetNotWhitelisted(tokenContract);
        }

        if (_assetTypeIndex[tokenContract] == 0) {
            _registerAssetType(tokenContract, IJunkyardSeries.AssetType.ERC721);
        }

        // Add tokenId to array
        _erc721Tokens[tokenContract].push(tokenId);
        uint256 newBalance = _erc721Tokens[tokenContract].length;
        _updateAssetTypeBalance(tokenContract, newBalance);

        IERC721(tokenContract).transferFrom(msg.sender, address(this), tokenId);

        emit AssetsDeposited(msg.sender, uint8(IJunkyardSeries.AssetType.ERC721), tokenContract, tokenId, 1);
    }

    /// @notice Deposit ERC1155 tokens to the prize pool
    /// @param tokenContract Address of the ERC1155 contract
    /// @param tokenId Token ID to deposit
    /// @param amount Amount to deposit
    function depositERC1155(address tokenContract, uint256 tokenId, uint256 amount) external nonReentrant {
        _requireDepositAuthorized(msg.sender);
        if (!_whitelistedAssets[tokenContract]) {
            revert AssetNotWhitelisted(tokenContract);
        }

        if (_assetTypeIndex[tokenContract] == 0) {
            _registerAssetType(tokenContract, IJunkyardSeries.AssetType.ERC1155);
        }

        // Add tokenId to tracking if first time
        if (_erc1155Balances[tokenContract][tokenId] == 0) {
            _erc1155TokenIds[tokenContract].push(tokenId);
        }

        // Update balance
        _erc1155Balances[tokenContract][tokenId] += amount;

        // Recalculate total balance
        uint256 newBalance = _calculateERC1155TotalBalance(tokenContract);
        _updateAssetTypeBalance(tokenContract, newBalance);

        IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        emit AssetsDeposited(msg.sender, uint8(IJunkyardSeries.AssetType.ERC1155), tokenContract, tokenId, amount);
    }

    /// @notice Initialize immutable config for an asset before the first purchase
    /// @dev Once initialized, an asset's config cannot be changed and new assets cannot be added after the first sale
    /// @param assetContract Address of the asset contract
    /// @param whitelisted Must be true; assets cannot be removed once initialized
    /// @param maxShareBps Max share consumable in one claim, in basis points
    function whitelistAsset(address assetContract, bool whitelisted, uint16 maxShareBps) external {
        _requireConfigUpdateAuthorized(msg.sender);
        _requireAssetSetOpen();

        if (!whitelisted) {
            revert CannotUnwhitelist();
        }

        if (_assetConfigured[assetContract]) {
            revert AssetConfigImmutable(assetContract);
        }

        if (maxShareBps == 0 || maxShareBps > 10_000) {
            revert InvalidAssetShareBps(maxShareBps);
        }

        _assetConfigured[assetContract] = true;
        _assetMaxShareBps[assetContract] = maxShareBps;
        _whitelistedAssets[assetContract] = whitelisted;

        emit AssetConfigInitialized(assetContract, maxShareBps);
        emit AssetWhitelisted(assetContract, whitelisted);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    AUTHORIZATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _requireConfigUpdateAuthorized(address caller) private view {
        (address creator, address configGuard) = _getSeriesAuth();

        // Default: only creator can update config.
        if (configGuard == address(0)) {
            if (caller != creator) revert UnauthorizedConfigUpdate();
            return;
        }

        bool authorized = IConfigGuard(configGuard).checkConfigUpdate(caller, creator);
        if (!authorized) revert UnauthorizedConfigUpdate();
    }

    function _requireDepositAuthorized(address caller) private view {
        (address creator, address configGuard) = _getSeriesAuth();

        // Default: only creator can deposit.
        if (configGuard == address(0)) {
            if (caller != creator) revert UnauthorizedDeposit();
            return;
        }

        bool authorized = IConfigGuard(configGuard).checkDeposit(caller, creator);
        if (!authorized) revert UnauthorizedDeposit();
    }

    function _requireAssetSetOpen() private view {
        if (IJunkyardSeries(series).isConfigLocked()) {
            revert SeriesAssetSetLocked();
        }
    }

    function _getSeriesAuth() private view returns (address creator, address configGuard) {
        // IJunkyardSeries.getConfig returns:
        // (creator, price, paymentToken, maxSupply, startTime, endTime, configGuard, buyGuard, oracle)
        (creator,,,,,, configGuard,,) = IJunkyardSeries(series).getConfig();
    }

    /// @notice Sync FT (fungible token) balance from contract
    /// @dev Queries actual balanceOf from contract and updates internal state
    /// @param tokenContract Address of the ERC20 token
    function syncFTBalance(address tokenContract) external {
        uint256 index = _assetTypeIndex[tokenContract];
        if (index == 0) {
            revert AssetTypeNotRegistered();
        }

        AssetType storage assetType = _assetTypes[index - 1];
        if (assetType.assetType != IJunkyardSeries.AssetType.ERC20) {
            revert InvalidAssetType();
        }

        // Query actual balance from contract
        uint256 actualBalance = IERC20(tokenContract).balanceOf(address(this));
        _erc20Balances[tokenContract] = actualBalance;
        assetType.balance = actualBalance;

        // Remove type if balance is zero
        if (actualBalance == 0) {
            _removeAssetType(tokenContract);
        }

        emit AssetBalanceSynced(tokenContract, actualBalance);
    }

    /// @notice Sync NFT balance from contract (ERC721 or ERC1155)
    /// @dev Queries actual owner/balance for provided tokenIds and reconciles with internal state
    /// @param nftContract Address of the NFT contract
    /// @param tokenIds Array of token IDs to sync
    function syncNFTBalance(address nftContract, uint256[] calldata tokenIds) external {
        uint256 index = _assetTypeIndex[nftContract];
        if (index == 0) {
            revert AssetTypeNotRegistered();
        }

        AssetType storage assetType = _assetTypes[index - 1];
        uint256[] memory preSyncTokenIds = assetType.assetType == IJunkyardSeries.AssetType.ERC721
            ? _copyUintArray(_erc721Tokens[nftContract])
            : _copyUintArray(_erc1155TokenIds[nftContract]);

        if (assetType.assetType == IJunkyardSeries.AssetType.ERC721) {
            _syncERC721(nftContract, tokenIds);
        } else if (assetType.assetType == IJunkyardSeries.AssetType.ERC1155) {
            _syncERC1155(nftContract, tokenIds);
        } else {
            revert InvalidAssetType();
        }

        // Update AssetType balance
        uint256 newBalance = assetType.assetType == IJunkyardSeries.AssetType.ERC721
            ? _erc721Tokens[nftContract].length
            : _calculateERC1155TotalBalance(nftContract);

        assetType.balance = newBalance;

        // Remove type if balance is zero
        if (newBalance == 0) {
            _removeAssetType(nftContract);
        }

        _emitSyncedTokenBalances(nftContract, assetType.assetType, tokenIds, preSyncTokenIds);
        emit AssetBalanceSynced(nftContract, newBalance);
    }

    /// @notice Distribute prizes to recipient
    /// @dev Returns between 1 and `maxAssetTypesPerOpening` distinct asset types using multi-round randomization
    /// @param recipient Address to receive the prizes
    /// @param randomSeed Random seed for selection
    /// @return prizes Array of distributed prize assets
    function distributePrize(
        address recipient,
        uint256 randomSeed
    )
        external
        onlySeries
        nonReentrant
        returns (IJunkyardSeries.PoolAsset[] memory prizes)
    {
        // Collect valid asset type indices once (gas optimization)
        uint256[] memory validIndices = new uint256[](_assetTypes.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < _assetTypes.length; i++) {
            if (_assetTypes[i].balance > 0) {
                validIndices[validCount] = i;
                validCount++;
            }
        }

        if (validCount == 0) {
            revert NoValidAssetTypes();
        }

        // Determine number of prizes
        uint256 maxPrizes = validCount < maxAssetTypesPerOpening ? validCount : maxAssetTypesPerOpening;
        uint256 numPrizes = (randomSeed % maxPrizes) + 1;

        prizes = new IJunkyardSeries.PoolAsset[](numPrizes);
        uint256[] memory selectedIndices = new uint256[](numPrizes);

        // Distribute prizes
        for (uint256 i = 0; i < numPrizes; i++) {
            // Cheap random derivation using bitshift instead of keccak256
            uint256 seed = randomSeed ^ (uint256(i) << 128);

            // Select unique type from valid indices
            uint256 typeIndex = _selectFromValidTypes(seed, validIndices, validCount, selectedIndices, i);
            selectedIndices[i] = typeIndex;

            AssetType storage assetType = _assetTypes[typeIndex];

            // Distribute based on type
            if (assetType.assetType == IJunkyardSeries.AssetType.ERC20) {
                uint256 amount = _distributeERC20(recipient, assetType.assetContract, seed);
                prizes[i] = IJunkyardSeries.PoolAsset({
                    assetType: IJunkyardSeries.AssetType.ERC20,
                    assetContract: assetType.assetContract,
                    tokenId: 0,
                    amount: amount
                });
            }
            if (assetType.assetType == IJunkyardSeries.AssetType.ERC721) {
                uint256 tokenId = _distributeERC721(recipient, assetType.assetContract, seed);
                prizes[i] = IJunkyardSeries.PoolAsset({
                    assetType: IJunkyardSeries.AssetType.ERC721,
                    assetContract: assetType.assetContract,
                    tokenId: tokenId,
                    amount: 1
                });
            }
            if (assetType.assetType == IJunkyardSeries.AssetType.ERC1155) {
                (uint256 tokenId, uint256 amount) = _distributeERC1155(recipient, assetType.assetContract, seed);
                prizes[i] = IJunkyardSeries.PoolAsset({
                    assetType: IJunkyardSeries.AssetType.ERC1155,
                    assetContract: assetType.assetContract,
                    tokenId: tokenId,
                    amount: amount
                });
            }
        }
    }

    /// @notice Sweep all remaining assets to a recipient
    /// @dev Used by series for leftover handling after a series ends.
    function sweepAll(address recipient) external onlySeries nonReentrant {
        // Copy types to memory to avoid mutation issues while sweeping.
        AssetType[] memory types = _assetTypes;

        for (uint256 i = 0; i < types.length; i++) {
            AssetType memory t = types[i];

            if (t.assetType == IJunkyardSeries.AssetType.ERC20) {
                uint256 bal = _erc20Balances[t.assetContract];
                if (bal > 0) {
                    _erc20Balances[t.assetContract] = 0;
                    IERC20(t.assetContract).safeTransfer(recipient, bal);
                    emit LeftoverSwept(recipient, uint8(IJunkyardSeries.AssetType.ERC20), t.assetContract, 0, bal);
                }
            } else if (t.assetType == IJunkyardSeries.AssetType.ERC721) {
                uint256[] storage tokens = _erc721Tokens[t.assetContract];
                while (tokens.length > 0) {
                    uint256 tokenId = tokens[tokens.length - 1];
                    tokens.pop();
                    IERC721(t.assetContract).transferFrom(address(this), recipient, tokenId);
                    emit LeftoverSwept(recipient, uint8(IJunkyardSeries.AssetType.ERC721), t.assetContract, tokenId, 1);
                }
            } else if (t.assetType == IJunkyardSeries.AssetType.ERC1155) {
                uint256[] storage tokenIds = _erc1155TokenIds[t.assetContract];
                while (tokenIds.length > 0) {
                    uint256 tokenId = tokenIds[tokenIds.length - 1];
                    tokenIds.pop();
                    uint256 amt = _erc1155Balances[t.assetContract][tokenId];
                    if (amt > 0) {
                        _erc1155Balances[t.assetContract][tokenId] = 0;
                        IERC1155(t.assetContract).safeTransferFrom(address(this), recipient, tokenId, amt, "");
                        emit LeftoverSwept(
                            recipient, uint8(IJunkyardSeries.AssetType.ERC1155), t.assetContract, tokenId, amt
                        );
                    }
                }
            }

            // Allow re-registering on future deposits; whitelist remains monotonic.
            delete _assetTypeIndex[t.assetContract];
        }

        delete _assetTypes;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    PRIVATE FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Register a new asset type
    function _registerAssetType(address assetContract, IJunkyardSeries.AssetType assetType) private {
        if (_assetTypeIndex[assetContract] != 0) {
            revert AssetTypeAlreadyRegistered();
        }

        _assetTypes.push(AssetType({assetContract: assetContract, assetType: assetType, balance: 0}));

        _assetTypeIndex[assetContract] = _assetTypes.length; // index + 1
    }

    /// @notice Update asset type balance
    function _updateAssetTypeBalance(address assetContract, uint256 newBalance) private {
        uint256 index = _assetTypeIndex[assetContract];
        if (index == 0) {
            revert AssetTypeNotRegistered();
        }
        _assetTypes[index - 1].balance = newBalance;
    }

    /// @notice Remove asset type from registry
    /// @dev Uses swap-and-pop for gas efficiency
    function _removeAssetType(address assetContract) private {
        uint256 index = _assetTypeIndex[assetContract];
        if (index == 0) return; // Already removed

        uint256 arrayIndex = index - 1;
        uint256 lastIndex = _assetTypes.length - 1;

        // Swap with last element if not already last
        if (arrayIndex != lastIndex) {
            AssetType storage lastType = _assetTypes[lastIndex];
            _assetTypes[arrayIndex] = lastType;
            // Update mapping for swapped element
            _assetTypeIndex[lastType.assetContract] = index;
        }

        // Remove last element
        _assetTypes.pop();
        delete _assetTypeIndex[assetContract];

        emit AssetTypeRemoved(assetContract);
    }

    function _emitSyncedTokenBalances(
        address nftContract,
        IJunkyardSeries.AssetType assetType,
        uint256[] calldata tokenIds,
        uint256[] memory preSyncTokenIds
    )
        private
    {
        uint256[] memory emitted = new uint256[](tokenIds.length + preSyncTokenIds.length);
        uint256 emittedCount = 0;

        for (uint256 i = 0; i < preSyncTokenIds.length; i++) {
            emittedCount = _emitTokenBalanceIfNeeded(nftContract, assetType, preSyncTokenIds[i], emitted, emittedCount);
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            emittedCount = _emitTokenBalanceIfNeeded(nftContract, assetType, tokenIds[i], emitted, emittedCount);
        }
    }

    function _emitTokenBalanceIfNeeded(
        address nftContract,
        IJunkyardSeries.AssetType assetType,
        uint256 tokenId,
        uint256[] memory emitted,
        uint256 emittedCount
    )
        private
        returns (uint256)
    {
        for (uint256 i = 0; i < emittedCount; i++) {
            if (emitted[i] == tokenId) {
                return emittedCount;
            }
        }

        emitted[emittedCount] = tokenId;

        uint256 newBalance = assetType == IJunkyardSeries.AssetType.ERC721
            ? (_erc721TokenTracked(nftContract, tokenId) ? 1 : 0)
            : _erc1155Balances[nftContract][tokenId];

        emit AssetTokenBalanceSynced(nftContract, uint8(assetType), tokenId, newBalance);
        return emittedCount + 1;
    }

    function _erc721TokenTracked(address nftContract, uint256 tokenId) private view returns (bool) {
        uint256[] storage tokens = _erc721Tokens[nftContract];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    function _copyUintArray(uint256[] storage source) private view returns (uint256[] memory copy) {
        copy = new uint256[](source.length);
        for (uint256 i = 0; i < source.length; i++) {
            copy[i] = source[i];
        }
    }

    /// @notice Sync ERC721 tokens by querying actual ownership
    /// @dev Reconciles internal state: add missing tokens, remove invalid ones
    function _syncERC721(address nftContract, uint256[] calldata tokenIds) private {
        uint256[] storage currentTokens = _erc721Tokens[nftContract];

        // Build set of current tokens for O(n) lookup
        bool[] memory tokenExists = new bool[](tokenIds.length);

        // Check which provided tokenIds are actually owned by this contract
        for (uint256 i = 0; i < tokenIds.length; i++) {
            try IERC721(nftContract).ownerOf(tokenIds[i]) returns (address owner) {
                tokenExists[i] = (owner == address(this));
            } catch {
                tokenExists[i] = false;
            }
        }

        // Remove tokens from current list that are no longer owned
        uint256 writeIndex = 0;
        for (uint256 i = 0; i < currentTokens.length; i++) {
            uint256 tokenId = currentTokens[i];

            // Check if still owned
            try IERC721(nftContract).ownerOf(tokenId) returns (address owner) {
                if (owner == address(this)) {
                    // Keep this token
                    currentTokens[writeIndex] = tokenId;
                    writeIndex++;
                }
            } catch {
                // Token doesn't exist or error, remove it
            }
        }

        // Trim array to actual size
        while (currentTokens.length > writeIndex) {
            currentTokens.pop();
        }

        // Add newly owned tokens that aren't in current list
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (!tokenExists[i]) continue;

            // Check if already in list
            bool alreadyExists = false;
            for (uint256 j = 0; j < currentTokens.length; j++) {
                if (currentTokens[j] == tokenIds[i]) {
                    alreadyExists = true;
                    break;
                }
            }

            if (!alreadyExists) {
                currentTokens.push(tokenIds[i]);
            }
        }
    }

    /// @notice Sync ERC1155 tokens by querying actual balances
    /// @dev Reconciles internal state: update balances, add/remove tokenIds
    function _syncERC1155(address nftContract, uint256[] calldata tokenIds) private {
        mapping(uint256 => uint256) storage balances = _erc1155Balances[nftContract];
        uint256[] storage trackedTokenIds = _erc1155TokenIds[nftContract];

        // Query actual balances for provided tokenIds
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 actualBalance = IERC1155(nftContract).balanceOf(address(this), tokenId);

            if (actualBalance > 0) {
                // Update balance
                uint256 oldBalance = balances[tokenId];
                balances[tokenId] = actualBalance;

                // Add to tracked list if new
                if (oldBalance == 0) {
                    bool alreadyTracked = false;
                    for (uint256 j = 0; j < trackedTokenIds.length; j++) {
                        if (trackedTokenIds[j] == tokenId) {
                            alreadyTracked = true;
                            break;
                        }
                    }
                    if (!alreadyTracked) {
                        trackedTokenIds.push(tokenId);
                    }
                }
            } else {
                // Balance is 0, remove from tracking
                if (balances[tokenId] > 0) {
                    balances[tokenId] = 0;

                    // Remove from tracked list
                    for (uint256 j = 0; j < trackedTokenIds.length; j++) {
                        if (trackedTokenIds[j] == tokenId) {
                            trackedTokenIds[j] = trackedTokenIds[trackedTokenIds.length - 1];
                            trackedTokenIds.pop();
                            break;
                        }
                    }
                }
            }
        }

        // Clean up: verify all tracked tokenIds still have balance
        uint256 writeIndex = 0;
        for (uint256 i = 0; i < trackedTokenIds.length; i++) {
            uint256 tokenId = trackedTokenIds[i];
            uint256 actualBalance = IERC1155(nftContract).balanceOf(address(this), tokenId);

            if (actualBalance > 0) {
                balances[tokenId] = actualBalance;
                trackedTokenIds[writeIndex] = tokenId;
                writeIndex++;
            } else {
                balances[tokenId] = 0;
            }
        }

        // Trim array
        while (trackedTokenIds.length > writeIndex) {
            trackedTokenIds.pop();
        }
    }

    /// @notice Select unique asset type from valid indices
    /// @dev Gas-optimized version working with pre-filtered valid indices
    function _selectFromValidTypes(
        uint256 randomSeed,
        uint256[] memory validIndices,
        uint256 validCount,
        uint256[] memory alreadySelected,
        uint256 numSelected
    )
        private
        pure
        returns (uint256)
    {
        // Build available pool (valid - already selected)
        uint256[] memory available = new uint256[](validCount);
        uint256 availableCount = 0;

        for (uint256 i = 0; i < validCount; i++) {
            uint256 typeIndex = validIndices[i];

            bool isSelected = false;
            for (uint256 j = 0; j < numSelected; j++) {
                if (alreadySelected[j] == typeIndex) {
                    isSelected = true;
                    break;
                }
            }

            if (!isSelected) {
                available[availableCount] = typeIndex;
                availableCount++;
            }
        }

        if (availableCount == 0) {
            revert NoValidAssetTypes();
        }

        return available[randomSeed % availableCount];
    }

    /// @notice Distribute ERC20 tokens
    function _distributeERC20(
        address recipient,
        address tokenContract,
        uint256 randomSeed
    )
        private
        returns (uint256 amount)
    {
        uint256 balance = _erc20Balances[tokenContract];
        if (balance == 0) {
            revert InsufficientERC20();
        }

        uint256 maxAmount = (balance * _assetMaxShareBps[tokenContract]) / 10_000;
        if (maxAmount == 0) maxAmount = 1;
        if (maxAmount > balance) maxAmount = balance;

        amount = 1 + (randomSeed % maxAmount);

        // Update storage
        _erc20Balances[tokenContract] -= amount;
        _updateAssetTypeBalance(tokenContract, _erc20Balances[tokenContract]);

        IERC20(tokenContract).safeTransfer(recipient, amount);
    }

    /// @notice Distribute ERC721 NFT
    function _distributeERC721(
        address recipient,
        address nftContract,
        uint256 randomSeed
    )
        private
        returns (uint256 tokenId)
    {
        uint256[] storage tokens = _erc721Tokens[nftContract];
        if (tokens.length == 0) {
            revert NoERC721Available();
        }

        // Random select tokenId
        uint256 index = randomSeed % tokens.length;
        tokenId = tokens[index];

        // Remove (swap and pop)
        tokens[index] = tokens[tokens.length - 1];
        tokens.pop();

        // Update balance
        _updateAssetTypeBalance(nftContract, tokens.length);

        IERC721(nftContract).transferFrom(address(this), recipient, tokenId);
    }

    /// @notice Distribute ERC1155 tokens
    function _distributeERC1155(
        address recipient,
        address nftContract,
        uint256 randomSeed
    )
        private
        returns (uint256 tokenId, uint256 amount)
    {
        uint256[] storage tokenIds = _erc1155TokenIds[nftContract];
        if (tokenIds.length == 0) {
            revert NoERC1155Available();
        }

        // Random select tokenId
        uint256 tokenIdIndex = randomSeed % tokenIds.length;
        tokenId = tokenIds[tokenIdIndex];

        uint256 available = _erc1155Balances[nftContract][tokenId];
        if (available == 0) {
            revert NoERC1155Balance();
        }

        uint256 maxQty = (available * _assetMaxShareBps[nftContract]) / 10_000;
        if (maxQty == 0) maxQty = 1;
        if (maxQty > available) maxQty = available;
        amount = 1 + (randomSeed % maxQty);

        // Update storage
        _erc1155Balances[nftContract][tokenId] -= amount;

        // Remove tokenId if depleted
        if (_erc1155Balances[nftContract][tokenId] == 0) {
            tokenIds[tokenIdIndex] = tokenIds[tokenIds.length - 1];
            tokenIds.pop();
        }

        // Recalculate total balance
        uint256 newBalance = _calculateERC1155TotalBalance(nftContract);
        _updateAssetTypeBalance(nftContract, newBalance);

        IERC1155(nftContract).safeTransferFrom(address(this), recipient, tokenId, amount, "");
    }

    /// @notice Calculate total ERC1155 balance for a contract
    function _calculateERC1155TotalBalance(address nftContract) private view returns (uint256) {
        uint256 total = 0;
        uint256[] storage tokenIds = _erc1155TokenIds[nftContract];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            total += _erc1155Balances[nftContract][tokenIds[i]];
        }
        return total;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the number of valid asset types (balance > 0)
    /// @return count Number of types with remaining balance
    function getPoolSize() external view returns (uint256 count) {
        for (uint256 i = 0; i < _assetTypes.length; i++) {
            if (_assetTypes[i].balance > 0) count++;
        }
    }

    /// @notice Get all asset types
    /// @return Asset type array
    function getAssetTypes() external view returns (AssetType[] memory) {
        return _assetTypes;
    }

    /// @notice Get immutable config for a whitelisted asset
    function getAssetConfig(address asset) external view returns (bool configured, uint16 maxShareBps) {
        return (_assetConfigured[asset], _assetMaxShareBps[asset]);
    }

    /// @notice Check if an asset is whitelisted
    /// @param asset Address of the asset
    /// @return whitelisted True if whitelisted
    function isAssetWhitelisted(address asset) external view returns (bool whitelisted) {
        return _whitelistedAssets[asset];
    }

    /// @notice ERC721 receiver hook
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /// @notice ERC1155 receiver hook
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /// @notice ERC1155 batch receiver hook
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    )
        external
        pure
        returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }
}
