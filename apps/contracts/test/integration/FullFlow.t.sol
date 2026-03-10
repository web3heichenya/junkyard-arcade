// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {JunkyardGlobalConfig} from "../../src/core/JunkyardGlobalConfig.sol";
import {JunkyardNFT} from "../../src/core/JunkyardNFT.sol";
import {JunkyardFactory} from "../../src/core/JunkyardFactory.sol";
import {IJunkyardFactory} from "../../src/interfaces/IJunkyardFactory.sol";
import {JunkyardSeries} from "../../src/core/JunkyardSeries.sol";
import {JunkyardPrizePool} from "../../src/core/JunkyardPrizePool.sol";
import {MockRandomnessProvider} from "../../src/oracles/MockRandomnessProvider.sol";
import {OwnerConfigGuard} from "../../src/guards/config/OwnerConfigGuard.sol";
import {OpenBuyGuard} from "../../src/guards/buy/OpenBuyGuard.sol";

/// @title MockERC20
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title MockNFT
contract MockNFT is ERC721 {
    uint256 private _nextTokenId = 1;

    constructor() ERC721("Mock NFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}

/// @title IntegrationTest
/// @notice End-to-end integration tests for the Junkyard Arcade platform
contract IntegrationTest is Test {
    // Contracts
    JunkyardGlobalConfig public globalConfig;
    JunkyardFactory public factory;
    MockRandomnessProvider public oracle;
    OwnerConfigGuard public configGuard;
    OpenBuyGuard public buyGuard;

    // Implementation contracts
    JunkyardSeries public seriesImpl;

    // Test tokens
    MockERC20 public paymentToken;
    MockERC20 public prizeToken;
    MockNFT public prizeNFT;

    // Users
    address public creator = address(0x1);
    address public buyer1 = address(0x2);
    address public buyer2 = address(0x3);

    function setUp() public {
        // Deploy implementation contracts
        seriesImpl = new JunkyardSeries();
        JunkyardNFT nftImpl = new JunkyardNFT();
        JunkyardPrizePool poolImpl = new JunkyardPrizePool();

        // Deploy core infrastructure
        globalConfig = new JunkyardGlobalConfig(
            address(this), 250, address(0xFEE), address(seriesImpl), address(nftImpl), address(poolImpl)
        ); // 2.5% fee
        oracle = new MockRandomnessProvider();

        // Deploy factory
        factory = new JunkyardFactory(address(globalConfig), address(this));

        // Deploy guards
        configGuard = new OwnerConfigGuard();
        buyGuard = new OpenBuyGuard();

        // Deploy test tokens
        paymentToken = new MockERC20("Payment Token", "PAY");
        prizeToken = new MockERC20("Prize Token", "PRIZE");
        prizeNFT = new MockNFT();

        // Configure whitelists in JunkyardGlobalConfig
        globalConfig.setOracleWhitelist(address(oracle), true);
        globalConfig.setPaymentTokenWhitelist(address(0), true); // Native token
        globalConfig.setPaymentTokenWhitelist(address(paymentToken), true);
        globalConfig.setGuardWhitelist(address(configGuard), true);
        globalConfig.setGuardWhitelist(address(buyGuard), true);

        // Fund users
        vm.deal(creator, 100 ether);
        vm.deal(buyer1, 100 ether);
        vm.deal(buyer2, 100 ether);

        paymentToken.mint(creator, 1000 ether);
        paymentToken.mint(buyer1, 1000 ether);
        paymentToken.mint(buyer2, 1000 ether);

        prizeToken.mint(creator, 10_000 ether);
        for (uint256 i = 0; i < 10; i++) {
            prizeNFT.mint(creator);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  FULL FLOW INTEGRATION TESTS              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Test complete flow: Create → Deposit → Purchase → Open → Claim
    function testIntegration_CompleteFlowWithNativePayment() public {
        // === STEP 1: Create Series ===
        vm.startPrank(creator);

        (uint256 seriesId) = factory.createSeries(
            "Junkyard Box #1", // NFT name
            "JYB1", // NFT symbol
            0.1 ether, // price
            address(0), // native payment
            10, // max supply
            block.timestamp, // start now
            0, // no end time
            address(configGuard),
            address(buyGuard),
            address(oracle),
            5
        );

        assertEq(seriesId, 1);

        // Get series addresses
        IJunkyardFactory.SeriesAddresses memory addrs = factory.getSeriesAddresses(seriesId);
        assertTrue(addrs.nft != address(0));
        assertTrue(addrs.series != address(0));
        assertTrue(addrs.prizePool != address(0));

        JunkyardSeries series = JunkyardSeries(payable(addrs.series));

        // Whitelist and deposit prizes
        JunkyardPrizePool pool = JunkyardPrizePool(address(series.prizePool()));
        pool.whitelistAsset(address(prizeToken), true, 1000);
        pool.whitelistAsset(address(prizeNFT), true, 10_000);
        prizeToken.approve(address(pool), 1000 ether);
        pool.depositERC20(address(prizeToken), 100 ether);
        pool.depositERC20(address(prizeToken), 200 ether);

        // Deposit ERC721 prizes
        prizeNFT.approve(address(pool), 1);
        pool.depositERC721(address(prizeNFT), 1);
        prizeNFT.approve(address(pool), 2);
        pool.depositERC721(address(prizeNFT), 2);

        vm.stopPrank();

        // Verify pool has 2 asset types (ERC20 and ERC721)
        assertEq(pool.getPoolSize(), 2);

        // === STEP 3: Purchase Blind Box ===
        vm.startPrank(buyer1);

        uint256 boxId = series.purchase{value: 0.1 ether}();
        assertEq(boxId, 1);
        // Verify box ownership from series-specific NFT
        assertEq(IERC721(addrs.nft).ownerOf(boxId), buyer1);
        // Series-specific NFT, no need to check seriesId

        // Verify stats
        (uint256 purchased, uint256 opened, uint256 claimed) = series.getStats();
        assertEq(purchased, 1);
        assertEq(opened, 0);
        assertEq(claimed, 0);

        // === STEP 4: Open Blind Box ===
        series.open{value: 0}(boxId);

        // Verify stats after opening
        (purchased, opened, claimed) = series.getStats();
        assertEq(purchased, 1);
        assertEq(opened, 1);
        assertEq(claimed, 0);

        // === STEP 5: Claim Prize ===
        uint256 buyer1ERC20BalanceBefore = prizeToken.balanceOf(buyer1);

        series.claim(boxId);

        // Verify stats after claiming
        (purchased, opened, claimed) = series.getStats();
        assertEq(purchased, 1);
        assertEq(opened, 1);
        assertEq(claimed, 1);

        // Verify blind box was burned
        vm.expectRevert();
        IERC721(addrs.nft).ownerOf(boxId);

        // Verify buyer received a prize (either ERC20 or ERC721)
        uint256 buyer1ERC20BalanceAfter = prizeToken.balanceOf(buyer1);
        uint256 buyer1NFTBalance = prizeNFT.balanceOf(buyer1);

        assertTrue(buyer1ERC20BalanceAfter > buyer1ERC20BalanceBefore || buyer1NFTBalance > 0);

        vm.stopPrank();
    }

    /// @notice Test multiple purchases and claims
    function testIntegration_MultiplePurchasesAndClaims() public {
        // Create series
        vm.prank(creator);
        (uint256 seriesId) = factory.createSeries(
            "Multi Box",
            "MULTI",
            0.05 ether,
            address(0),
            5,
            block.timestamp,
            0,
            address(configGuard),
            address(buyGuard),
            address(oracle),
            5
        );

        IJunkyardFactory.SeriesAddresses memory addrs = factory.getSeriesAddresses(seriesId);
        JunkyardSeries series = JunkyardSeries(payable(addrs.series));

        // Deposit prizes
        vm.startPrank(creator);
        JunkyardPrizePool pool = JunkyardPrizePool(address(series.prizePool()));
        pool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(pool), 500 ether);
        for (uint256 i = 0; i < 5; i++) {
            pool.depositERC20(address(prizeToken), 100 ether);
        }
        vm.stopPrank();

        // Buyer 1 purchases 2 boxes
        vm.startPrank(buyer1);
        uint256 box1 = series.purchase{value: 0.05 ether}();
        uint256 box2 = series.purchase{value: 0.05 ether}();
        vm.stopPrank();

        // Buyer 2 purchases 1 box
        vm.prank(buyer2);
        uint256 box3 = series.purchase{value: 0.05 ether}();

        // Verify purchase counts
        assertEq(series.getPurchaseCount(buyer1), 2);
        assertEq(series.getPurchaseCount(buyer2), 1);

        // Open and claim for buyer1
        vm.startPrank(buyer1);
        series.open(box1);
        series.claim(box1);
        series.open(box2);
        series.claim(box2);
        vm.stopPrank();

        // Open and claim for buyer2
        vm.startPrank(buyer2);
        series.open(box3);
        series.claim(box3);
        vm.stopPrank();

        // Verify final stats
        (uint256 purchased, uint256 opened, uint256 claimed) = series.getStats();
        assertEq(purchased, 3);
        assertEq(opened, 3);
        assertEq(claimed, 3);

        // Verify prizes distributed
        assertTrue(prizeToken.balanceOf(buyer1) > 0);
        assertTrue(prizeToken.balanceOf(buyer2) > 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SCENARIO TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Test series with ERC20 payment
    function testIntegration_ERC20Payment() public {
        vm.prank(creator);
        (uint256 seriesId) = factory.createSeries(
            "ERC20 Pay Box",
            "ERC20",
            100 ether, // 100 payment tokens
            address(paymentToken),
            10,
            block.timestamp,
            0,
            address(configGuard),
            address(buyGuard),
            address(oracle),
            5
        );

        IJunkyardFactory.SeriesAddresses memory addrs = factory.getSeriesAddresses(seriesId);
        JunkyardSeries series = JunkyardSeries(payable(addrs.series));
        JunkyardPrizePool pool = JunkyardPrizePool(address(series.prizePool()));

        // Deposit multiple prizes
        vm.startPrank(creator);
        pool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(pool), 500 ether);
        pool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();

        // Purchase with ERC20
        vm.startPrank(buyer1);
        paymentToken.approve(addrs.series, 100 ether);

        uint256 balanceBefore = paymentToken.balanceOf(buyer1);
        uint256 boxId = series.purchase();
        uint256 balanceAfter = paymentToken.balanceOf(buyer1);

        assertEq(balanceBefore - balanceAfter, 100 ether);
        assertEq(IERC721(addrs.nft).ownerOf(boxId), buyer1);

        vm.stopPrank();
    }

    /// @notice Test time-limited series
    function testIntegration_TimeLimitedSeries() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 endTime = startTime + 1 days;

        vm.prank(creator);
        (uint256 seriesId) = factory.createSeries(
            "Time Limited Box",
            "TIME",
            0.1 ether,
            address(0),
            10,
            startTime,
            endTime,
            address(configGuard),
            address(buyGuard),
            address(oracle),
            5
        );

        IJunkyardFactory.SeriesAddresses memory addrs = factory.getSeriesAddresses(seriesId);
        JunkyardSeries series = JunkyardSeries(payable(addrs.series));
        JunkyardPrizePool pool = JunkyardPrizePool(address(series.prizePool()));

        // Seed pool so purchase failures are due to timing, not empty inventory.
        vm.startPrank(creator);
        pool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(pool), 1 ether);
        pool.depositERC20(address(prizeToken), 1 ether);
        vm.stopPrank();

        // Try to purchase before start - should revert
        vm.prank(buyer1);
        vm.expectRevert();
        series.purchase{value: 0.1 ether}();

        // Warp to start time
        vm.warp(startTime);

        // Purchase should work now
        vm.prank(buyer1);
        uint256 boxId = series.purchase{value: 0.1 ether}();
        assertEq(boxId, 1);

        // Warp past end time
        vm.warp(endTime + 1);

        // Purchase should revert
        vm.prank(buyer2);
        vm.expectRevert();
        series.purchase{value: 0.1 ether}();
    }
}
