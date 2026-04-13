// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../../src/core/JunkyardPrizePool.sol";
import "../../src/interfaces/IJunkyardPrizePool.sol";
import "../../src/interfaces/IJunkyardSeries.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "../mocks/MockERC20.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC1155.sol";
import "../mocks/FeeOnTransferERC20.sol";

contract MockSeriesForPoolAuth {
    address public immutable CREATOR;
    address public immutable CONFIG_GUARD;
    bool private _locked;

    constructor(address creator, address configGuard) {
        CREATOR = creator;
        CONFIG_GUARD = configGuard;
    }

    function setLocked(bool locked) external {
        _locked = locked;
    }

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
        (price, paymentToken, maxSupply, startTime, endTime, buyGuard, oracle) =
            (0, address(0), 0, 0, 0, address(0), address(0));
        return (CREATOR, price, paymentToken, maxSupply, startTime, endTime, CONFIG_GUARD, buyGuard, oracle);
    }

    function isConfigLocked() external view returns (bool) {
        return _locked;
    }
}

contract JunkyardPrizePoolTest is Test, IERC1155Receiver {
    JunkyardPrizePool public pool;
    JunkyardPrizePool public poolImpl;

    MockERC20 public token;
    MockERC721 public nft;
    MockERC1155 public items;
    FeeOnTransferERC20 public feeToken;

    address public series;
    address public user = address(0x5678);
    MockSeriesForPoolAuth public mockSeries;

    event AssetsDeposited(
        address indexed depositor, uint8 assetType, address indexed assetContract, uint256 tokenId, uint256 amount
    );

    event AssetBalanceSynced(address indexed asset, uint256 newBalance);
    event AssetTokenBalanceSynced(address indexed asset, uint8 assetType, uint256 indexed tokenId, uint256 newBalance);
    event AssetTypeRemoved(address indexed asset);

    function setUp() public {
        // Deploy mock tokens
        token = new MockERC20("Prize Token", "PRIZE", 18);
        nft = new MockERC721("Prize NFT", "PNFT");
        items = new MockERC1155();
        feeToken = new FeeOnTransferERC20("Fee Token", "FEE", 1000, address(0xBEEF));

        mockSeries = new MockSeriesForPoolAuth(address(this), address(0));
        series = address(mockSeries);

        // Deploy pool
        poolImpl = new JunkyardPrizePool();
        pool = JunkyardPrizePool(Clones.clone(address(poolImpl)));
        pool.initialize(series, 5);

        // Mint tokens to this contract
        token.mint(address(this), 10_000 ether);
        for (uint256 i = 1; i <= 10; i++) {
            nft.mint(address(this), i);
        }
        items.mint(address(this), 1, 1000);
        items.mint(address(this), 2, 500);
        feeToken.mint(address(this), 1000 ether);

        // Approve pool
        token.approve(address(pool), type(uint256).max);
        nft.setApprovalForAll(address(pool), true);
        items.setApprovalForAll(address(pool), true);
        feeToken.approve(address(pool), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                        DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testDepositERC20_Success() public {
        pool.whitelistAsset(address(token), true, 1000);

        vm.expectEmit(true, true, false, true);
        emit AssetsDeposited(address(this), uint8(IJunkyardSeries.AssetType.ERC20), address(token), 0, 1000 ether);

        pool.depositERC20(address(token), 1000 ether);

        assertEq(pool.getPoolSize(), 1);
        assertEq(token.balanceOf(address(pool)), 1000 ether);
    }

    function testDepositERC20_MultipleDeposits() public {
        pool.whitelistAsset(address(token), true, 1000);

        pool.depositERC20(address(token), 1000 ether);
        pool.depositERC20(address(token), 500 ether);
        pool.depositERC20(address(token), 300 ether);

        // Should still be 1 asset type
        assertEq(pool.getPoolSize(), 1);
        assertEq(token.balanceOf(address(pool)), 1800 ether);
    }

    function testDepositERC20_UsesActualReceivedAmount() public {
        pool.whitelistAsset(address(feeToken), true, 1000);

        pool.depositERC20(address(feeToken), 100 ether);

        // 10% transfer fee, so pool should only account for the net amount.
        assertEq(feeToken.balanceOf(address(pool)), 90 ether);
    }

    function testDepositERC721_Success() public {
        pool.whitelistAsset(address(nft), true, 10_000);

        pool.depositERC721(address(nft), 1);

        assertEq(pool.getPoolSize(), 1);
        assertEq(nft.ownerOf(1), address(pool));
    }

    function testDepositERC1155_Success() public {
        pool.whitelistAsset(address(items), true, 1000);

        pool.depositERC1155(address(items), 1, 100);

        assertEq(pool.getPoolSize(), 1);
        assertEq(items.balanceOf(address(pool), 1), 100);
    }

    function testDepositERC1155_MultipleBatches() public {
        pool.whitelistAsset(address(items), true, 1000);

        pool.depositERC1155(address(items), 1, 100);
        pool.depositERC1155(address(items), 1, 50); // Same tokenId
        pool.depositERC1155(address(items), 2, 200); // Different tokenId

        assertEq(pool.getPoolSize(), 1); // Still one asset type
        assertEq(items.balanceOf(address(pool), 1), 150);
        assertEq(items.balanceOf(address(pool), 2), 200);
    }

    /*//////////////////////////////////////////////////////////////
                        SYNC TESTS - FT
    //////////////////////////////////////////////////////////////*/

    function testSyncFTBalance_DirectTransfer() public {
        // Register and deposit initial
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        // Direct transfer (donation)
        token.transfer(address(pool), 500 ether);

        // Before sync
        assertEq(pool.getPoolSize(), 1);

        // Sync
        vm.expectEmit(true, false, false, true);
        emit AssetBalanceSynced(address(token), 1500 ether);

        pool.syncFTBalance(address(token));

        // Balance should be updated
        assertEq(token.balanceOf(address(pool)), 1500 ether);
    }

    function testSyncFTBalance_RemoveZeroBalance() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        // Transfer all tokens out (simulate distribution)
        vm.prank(address(pool));
        token.transfer(user, 1000 ether);

        assertEq(pool.getPoolSize(), 1); // Still tracked

        // Sync should remove
        vm.expectEmit(true, false, false, false);
        emit AssetTypeRemoved(address(token));

        pool.syncFTBalance(address(token));

        assertEq(pool.getPoolSize(), 0); // Should be removed
    }

    /*//////////////////////////////////////////////////////////////
                        SYNC TESTS - NFT
    //////////////////////////////////////////////////////////////*/

    function testSyncNFTBalance_ERC721_AddMissing() public {
        pool.whitelistAsset(address(nft), true, 10_000);
        pool.depositERC721(address(nft), 1);

        // Direct transfer NFT#2 (bypass deposit)
        nft.transferFrom(address(this), address(pool), 2);

        // Sync with both tokenIds
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 1;
        tokenIds[1] = 2;

        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(nft), uint8(IJunkyardSeries.AssetType.ERC721), 1, 1);
        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(nft), uint8(IJunkyardSeries.AssetType.ERC721), 2, 1);

        pool.syncNFTBalance(address(nft), tokenIds);

        // Should now track both
        assertEq(pool.getPoolSize(), 1); // Still 1 asset type
    }

    function testSyncNFTBalance_ERC721_RemoveInvalid() public {
        pool.whitelistAsset(address(nft), true, 10_000);
        pool.depositERC721(address(nft), 1);
        pool.depositERC721(address(nft), 2);

        // Transfer NFT#1 out
        vm.prank(address(pool));
        nft.transferFrom(address(pool), user, 1);

        // Sync
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 1;
        tokenIds[1] = 2;

        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(nft), uint8(IJunkyardSeries.AssetType.ERC721), 1, 0);
        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(nft), uint8(IJunkyardSeries.AssetType.ERC721), 2, 1);

        pool.syncNFTBalance(address(nft), tokenIds);

        // Should only track NFT#2
        assertEq(pool.getPoolSize(), 1); // Still 1 type, but with reduced balance
    }

    function testSyncNFTBalance_ERC1155_UpdateBalances() public {
        pool.whitelistAsset(address(items), true, 1000);
        pool.depositERC1155(address(items), 1, 100);

        // Direct transfer more
        items.safeTransferFrom(address(this), address(pool), 1, 50, "");
        items.safeTransferFrom(address(this), address(pool), 2, 200, "");

        // Sync
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 1;
        tokenIds[1] = 2;

        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(items), uint8(IJunkyardSeries.AssetType.ERC1155), 1, 150);
        vm.expectEmit(true, false, true, true);
        emit AssetTokenBalanceSynced(address(items), uint8(IJunkyardSeries.AssetType.ERC1155), 2, 200);

        pool.syncNFTBalance(address(items), tokenIds);

        // Verify balances updated
        assertEq(items.balanceOf(address(pool), 1), 150);
        assertEq(items.balanceOf(address(pool), 2), 200);
    }

    /*//////////////////////////////////////////////////////////////
                    DISTRIBUTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testDistributePrize_Single() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 12_345);

        assertGe(prizes.length, 1);
        assertLe(prizes.length, 1); // Only 1 type available
        assertEq(uint8(prizes[0].assetType), uint8(IJunkyardSeries.AssetType.ERC20));
        assertGt(prizes[0].amount, 0);
        assertGt(token.balanceOf(user), 0);
    }

    function testDistributePrize_MultipleTypes() public {
        // Setup 3 types
        pool.whitelistAsset(address(token), true, 1000);
        pool.whitelistAsset(address(nft), true, 10_000);
        pool.whitelistAsset(address(items), true, 1000);

        pool.depositERC20(address(token), 1000 ether);
        pool.depositERC721(address(nft), 1);
        pool.depositERC721(address(nft), 2);
        pool.depositERC1155(address(items), 1, 100);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 99_999);

        assertGe(prizes.length, 1);
        assertLe(prizes.length, 3); // Max 3 types available

        // Verify no duplicates
        for (uint256 i = 0; i < prizes.length; i++) {
            for (uint256 j = i + 1; j < prizes.length; j++) {
                assertTrue(prizes[i].assetContract != prizes[j].assetContract);
            }
        }
    }

    function testDistributePrize_ERC20Percentage() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 10_000 ether);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 54_321);

        uint256 received = prizes[0].amount;

        // Should be between 1 wei and configured 10%
        assertGe(received, 1);
        assertLe(received, 1000 ether); // 10% of 10000
    }

    function testDistributePrize_ERC20SmallBalance_DoesNotRevert() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 9);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 1);

        assertEq(prizes.length, 1);
        assertEq(uint8(prizes[0].assetType), uint8(IJunkyardSeries.AssetType.ERC20));
        assertGt(prizes[0].amount, 0);
        assertEq(token.balanceOf(user), prizes[0].amount);
    }

    function testDistributePrize_EmptyPool() public {
        vm.prank(series);
        vm.expectRevert(IJunkyardPrizePool.NoValidAssetTypes.selector);
        pool.distributePrize(user, 12_345);
    }

    function testSweepAll_TransfersAllAndClears() public {
        address recipient = address(0xBEEF);

        pool.whitelistAsset(address(token), true, 1000);
        pool.whitelistAsset(address(nft), true, 10_000);
        pool.whitelistAsset(address(items), true, 1000);

        pool.depositERC20(address(token), 100 ether);
        pool.depositERC721(address(nft), 1);
        pool.depositERC1155(address(items), 1, 25);
        pool.depositERC1155(address(items), 2, 4);

        assertEq(pool.getPoolSize(), 3);

        vm.prank(series);
        pool.sweepAll(recipient);

        assertEq(pool.getPoolSize(), 0);
        assertEq(token.balanceOf(recipient), 100 ether);
        assertEq(nft.ownerOf(1), recipient);
        assertEq(items.balanceOf(recipient, 1), 25);
        assertEq(items.balanceOf(recipient, 2), 4);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function testMaxPrizesPerOpening_Limit() public {
        // Setup 10 funded types while pool config caps one opening at 5 distinct asset types.
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        for (uint256 i = 1; i <= 9; i++) {
            MockERC721 newNFT = new MockERC721("NFT", "NFT");
            newNFT.mint(address(this), 1);
            newNFT.setApprovalForAll(address(pool), true);
            pool.whitelistAsset(address(newNFT), true, 10_000);
            pool.depositERC721(address(newNFT), 1);
        }

        assertEq(pool.getPoolSize(), 10);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 77_777);

        // Should never exceed 5
        assertLe(prizes.length, 5);
    }

    function testAssetTypeBalance_UpdateAfterDistribute() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        uint256 balanceBefore = token.balanceOf(address(pool));

        vm.prank(series);
        pool.distributePrize(user, 11_111);

        uint256 balanceAfter = token.balanceOf(address(pool));

        // Balance should decrease
        assertLt(balanceAfter, balanceBefore);
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Fuzz test for distribution with random seeds
    function testFuzz_DistributePrize_RandomSeeds(uint256 randomSeed) public {
        vm.assume(randomSeed > 0);

        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 10_000 ether);

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, randomSeed);

        // Should always return valid prizes
        assertGe(prizes.length, 1);
        assertLe(prizes.length, 1); // Only 1 type in pool
        assertGt(prizes[0].amount, 0);

        // Should be within configured max-share range
        assertGe(prizes[0].amount, 1);
        assertLe(prizes[0].amount, 1000 ether);
    }

    /// @notice Fuzz test for multi-asset distribution with no duplicates
    function testFuzz_MultiAsset_NoDuplicates(uint256 seed) public {
        vm.assume(seed > 0);

        // Setup 5 different types
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        for (uint256 i = 1; i <= 4; i++) {
            MockERC721 newNFT = new MockERC721("NFT", "NFT");
            newNFT.mint(address(this), 1);
            newNFT.setApprovalForAll(address(pool), true);
            pool.whitelistAsset(address(newNFT), true, 10_000);
            pool.depositERC721(address(newNFT), 1);
        }

        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, seed);

        // Verify no duplicates
        for (uint256 i = 0; i < prizes.length; i++) {
            for (uint256 j = i + 1; j < prizes.length; j++) {
                assertTrue(prizes[i].assetContract != prizes[j].assetContract, "Duplicate asset type");
            }
        }

        // Should be between 1 and 5 prizes
        assertGe(prizes.length, 1);
        assertLe(prizes.length, 5);
    }

    /// @notice Fuzz test for deposit amounts
    function testFuzz_DepositERC20_Amounts(uint96 amount) public {
        vm.assume(amount > 0);

        pool.whitelistAsset(address(token), true, 1000);
        token.mint(address(this), amount);

        pool.depositERC20(address(token), amount);

        assertEq(token.balanceOf(address(pool)), amount);
        assertEq(pool.getPoolSize(), 1);
    }

    /// @notice Fuzz test for balance conservation
    function testFuzz_BalanceConservation(uint256 seed1, uint256 seed2) public {
        vm.assume(seed1 > 0 && seed2 > 0 && seed1 != seed2);

        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        uint256 initialBalance = token.balanceOf(address(pool));

        // First distribution
        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes1 = pool.distributePrize(user, seed1);

        // Second distribution
        address user2Addr = address(0x9999);
        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes2 = pool.distributePrize(user2Addr, seed2);

        uint256 afterSecond = token.balanceOf(address(pool));

        // Total distributed should equal initial minus remaining
        uint256 totalDistributed = prizes1[0].amount + prizes2[0].amount;
        assertEq(initialBalance - afterSecond, totalDistributed);
    }

    /*//////////////////////////////////////////////////////////////
                    IERC1155RECEIVER IMPLEMENTATION
    //////////////////////////////////////////////////////////////*/

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    )
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    )
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }

    function testWhitelistAsset_StoresImmutableConfig() public {
        pool.whitelistAsset(address(token), true, 2500);

        (bool configured, uint16 maxShareBps) = pool.getAssetConfig(address(token));
        assertTrue(configured);
        assertEq(maxShareBps, 2500);
    }

    function testWhitelistAsset_RevertWhenSeriesLocked() public {
        mockSeries.setLocked(true);

        vm.expectRevert(IJunkyardPrizePool.SeriesAssetSetLocked.selector);
        pool.whitelistAsset(address(token), true, 1000);
    }
}
