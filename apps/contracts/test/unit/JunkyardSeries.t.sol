// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {JunkyardSeries} from "../../src/core/JunkyardSeries.sol";
import {JunkyardGlobalConfig} from "../../src/core/JunkyardGlobalConfig.sol";
import {JunkyardNFT} from "../../src/core/JunkyardNFT.sol";
import {JunkyardPrizePool} from "../../src/core/JunkyardPrizePool.sol";
import {MockRandomnessProvider} from "../../src/oracles/MockRandomnessProvider.sol";
import {OwnerConfigGuard} from "../../src/guards/config/OwnerConfigGuard.sol";
import {OpenBuyGuard} from "../../src/guards/buy/OpenBuyGuard.sol";
import {IJunkyardSeries} from "../../src/interfaces/IJunkyardSeries.sol";
import {IJunkyardPrizePool} from "../../src/interfaces/IJunkyardPrizePool.sol";
import {IRandomnessProvider} from "../../src/interfaces/IRandomnessProvider.sol";
import {FeeOnTransferERC20} from "../mocks/FeeOnTransferERC20.sol";

contract DelayedRandomnessProvider is IRandomnessProvider {
    mapping(bytes32 => bool) private _fulfilled;
    mapping(bytes32 => uint256) private _randomness;
    uint256 private _counter;
    uint256 private _requestPrice;

    function requestRandomness() external payable returns (bytes32 requestId) {
        require(msg.value >= _requestPrice, "fee too low");
        unchecked {
            ++_counter;
        }
        requestId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _counter));
        emit RandomnessRequested(requestId, msg.sender);
        // Intentionally not fulfilled.
    }

    function setRequestPrice(uint256 requestPrice) external {
        _requestPrice = requestPrice;
    }

    function getRandomness(bytes32 requestId) external view returns (uint256) {
        return _randomness[requestId];
    }

    function getRequestPrice() external view returns (uint256) {
        return _requestPrice;
    }

    function estimateRequestPrice(uint256) external view returns (uint256) {
        return _requestPrice;
    }

    function isFulfilled(bytes32 requestId) external view returns (bool) {
        return _fulfilled[requestId];
    }
}

/// @title MockERC20
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {}

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

/// @title JunkyardSeriesTest
/// @notice Unit tests for JunkyardSeries contract
contract JunkyardSeriesTest is Test {
    // Contracts
    JunkyardGlobalConfig public globalConfig;
    JunkyardNFT public blindBoxNFT;
    MockRandomnessProvider public oracle;
    OwnerConfigGuard public configGuard;
    OpenBuyGuard public buyGuard;
    JunkyardSeries public series;
    JunkyardPrizePool public prizePool;

    // Test tokens
    MockERC20 public prizeToken;
    MockNFT public prizeNFT;

    // Users
    address public creator = address(0x1);
    address public buyer = address(0x2);
    address public other = address(0x3);

    function setUp() public {
        // Deploy implementations
        JunkyardNFT nftImpl = new JunkyardNFT();
        JunkyardSeries seriesImpl = new JunkyardSeries();
        JunkyardPrizePool poolImpl = new JunkyardPrizePool();

        // Deploy infrastructure
        globalConfig = new JunkyardGlobalConfig(
            address(this), 250, address(0xFEE), address(seriesImpl), address(nftImpl), address(poolImpl)
        );
        oracle = new MockRandomnessProvider();
        configGuard = new OwnerConfigGuard();
        buyGuard = new OpenBuyGuard();

        // Deploy test tokens
        prizeToken = new MockERC20();
        prizeNFT = new MockNFT();

        // Deploy as clones
        blindBoxNFT = JunkyardNFT(Clones.clone(address(nftImpl)));
        series = JunkyardSeries(payable(Clones.clone(address(seriesImpl))));

        // Deploy prize pool
        prizePool = JunkyardPrizePool(Clones.clone(address(poolImpl)));

        // Initialize NFT
        blindBoxNFT.initialize("Test Box", "TBOX", address(series), address(this));

        // Initialize prize pool
        prizePool.initialize(address(series), 5);

        // Initialize series
        series.initialize(
            address(blindBoxNFT),
            address(prizePool), // prize pool
            1, // seriesId
            creator,
            0.1 ether, // price
            address(0), // native payment
            10, // maxSupply
            block.timestamp,
            0, // no end time
            address(configGuard),
            address(buyGuard),
            address(oracle),
            address(globalConfig)
        );

        // Transfer NFT ownership to series
        blindBoxNFT.transferOwnership(address(series));

        // Fund users
        vm.deal(creator, 100 ether);
        vm.deal(buyer, 100 ether);
        vm.deal(other, 100 ether);

        // Mint prize tokens to creator
        prizeToken.mint(creator, 10_000 ether);
        for (uint256 i = 0; i < 5; i++) {
            prizeNFT.mint(creator);
        }
    }

    function _seedPoolMinimal() internal {
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(prizePool), 1 ether);
        prizePool.depositERC20(address(prizeToken), 1 ether);
        vm.stopPrank();
    }

    function testDeposit_ERC20Success() public {
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(prizePool), 100 ether);
        prizePool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();

        assertEq(prizePool.getPoolSize(), 1);
    }

    function testDeposit_ERC20RevertWhenNotWhitelisted() public {
        vm.startPrank(creator);
        prizeToken.approve(address(prizePool), 100 ether);

        vm.expectRevert(abi.encodeWithSelector(IJunkyardPrizePool.AssetNotWhitelisted.selector, address(prizeToken)));
        prizePool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();
    }

    function testDeposit_ERC721Success() public {
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeNFT), true, 10_000);
        prizeNFT.approve(address(prizePool), 1);
        prizePool.depositERC721(address(prizeNFT), 1);
        vm.stopPrank();

        assertEq(prizePool.getPoolSize(), 1);
        assertEq(prizeNFT.ownerOf(1), address(prizePool));
    }

    function testPurchase_Success() public {
        _seedPoolMinimal();
        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        assertEq(boxId, 1);
        assertEq(blindBoxNFT.ownerOf(boxId), buyer);
        assertEq(series.getPurchaseCount(buyer), 1);
    }

    function testPurchase_RefundsExcessPayment() public {
        _seedPoolMinimal();
        uint256 balanceBefore = buyer.balance;

        vm.prank(buyer);
        series.purchase{value: 0.5 ether}();

        uint256 balanceAfter = buyer.balance;
        assertEq(balanceBefore - balanceAfter, 0.1 ether);
    }

    function testPurchase_PaysProtocolFeeAndCreatorProceeds() public {
        _seedPoolMinimal();
        address feeRecipient = address(0xFEE);
        uint256 feeRecipientBefore = feeRecipient.balance;
        uint256 creatorBefore = creator.balance;

        vm.prank(buyer);
        series.purchase{value: 0.1 ether}();

        uint256 fee = (0.1 ether * 250) / 10_000;
        assertEq(feeRecipient.balance - feeRecipientBefore, fee);
        assertEq(creator.balance - creatorBefore, 0.1 ether - fee);
    }

    function testPurchase_RevertWhenMaxSupplyReached() public {
        _seedPoolMinimal();
        // Purchase all boxes
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(buyer);
            series.purchase{value: 0.1 ether}();
        }

        // Try to purchase one more
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.MaxSupplyReached.selector, 10));
        series.purchase{value: 0.1 ether}();
    }

    function testOpen_Success() public {
        _seedPoolMinimal();
        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        vm.prank(buyer);
        series.open(boxId);

        (, uint256 totalOpened,) = series.getStats();
        assertEq(totalOpened, 1);
    }

    function testOpen_RevertWhenInsufficientOracleFee() public {
        _seedPoolMinimal();
        oracle.setRequestPrice(0.02 ether);

        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.InsufficientOracleFee.selector, 0.02 ether, 0.01 ether));
        series.open{value: 0.01 ether}(boxId);
    }

    function testOpen_RefundsExcessOracleFee() public {
        _seedPoolMinimal();
        oracle.setRequestPrice(0.02 ether);

        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        uint256 balanceBefore = buyer.balance;

        vm.prank(buyer);
        series.open{value: 0.05 ether}(boxId);

        uint256 balanceAfter = buyer.balance;
        assertEq(balanceBefore - balanceAfter, 0.02 ether);
    }

    function testOpen_RevertWhenAlreadyOpened() public {
        _seedPoolMinimal();
        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        vm.prank(buyer);
        series.open(boxId);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.BlindBoxAlreadyOpened.selector, boxId));
        series.open(boxId);
    }

    function testClaim_RevertWhenNotOpened() public {
        _seedPoolMinimal();
        vm.prank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.BlindBoxNotOpened.selector, boxId));
        series.claim(boxId);
    }

    function testClaim_Success() public {
        // Deposit prize
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(prizePool), 100 ether);
        prizePool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();

        // Purchase and open
        vm.startPrank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();
        series.open(boxId);

        // Claim
        uint256 balanceBefore = prizeToken.balanceOf(buyer);
        series.claim(boxId);
        uint256 balanceAfter = prizeToken.balanceOf(buyer);

        // Verify prize received
        assertTrue(balanceAfter > balanceBefore);

        // Verify NFT burned
        vm.expectRevert();
        blindBoxNFT.ownerOf(boxId);

        vm.stopPrank();
    }

    function testClaim_RevertWhenRandomnessNotFulfilled() public {
        // Deploy a separate series with a delayed randomness provider.
        DelayedRandomnessProvider delayedOracle = new DelayedRandomnessProvider();

        // Deploy implementations
        JunkyardNFT nftImpl = new JunkyardNFT();
        JunkyardSeries seriesImpl = new JunkyardSeries();
        JunkyardPrizePool poolImpl = new JunkyardPrizePool();

        JunkyardNFT nft = JunkyardNFT(Clones.clone(address(nftImpl)));
        JunkyardSeries s = JunkyardSeries(payable(Clones.clone(address(seriesImpl))));
        JunkyardPrizePool pool = JunkyardPrizePool(Clones.clone(address(poolImpl)));

        nft.initialize("Test Box 2", "TBOX2", address(s), address(this));
        pool.initialize(address(s), 5);

        s.initialize(
            address(nft),
            address(pool),
            2,
            creator,
            0.1 ether,
            address(0),
            10,
            block.timestamp,
            0,
            address(configGuard),
            address(buyGuard),
            address(delayedOracle),
            address(globalConfig)
        );

        nft.transferOwnership(address(s));

        // Deposit prize
        vm.startPrank(creator);
        pool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(pool), 100 ether);
        pool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();

        vm.startPrank(buyer);
        uint256 boxId = s.purchase{value: 0.1 ether}();

        vm.recordLogs();
        s.open(boxId);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 requestId;
        bytes32 sig = keccak256("BlindBoxOpened(address,uint256,bytes32,uint256)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == sig) {
                (requestId,) = abi.decode(logs[i].data, (bytes32, uint256));
                break;
            }
        }

        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.RandomnessNotFulfilled.selector, requestId));
        s.claim(boxId);
        vm.stopPrank();
    }

    function testUpdateSaleConfig_BeforeFirstPurchase_AllowsUpdates() public {
        // Before any purchases, creator can freely update sale config.
        (address c0, uint256 p0,, uint256 max0, uint256 start0, uint256 end0,,,) = series.getConfig();
        assertEq(c0, creator);
        assertEq(p0, 0.1 ether);
        assertEq(max0, 10);
        assertEq(start0, block.timestamp);
        assertEq(end0, 0);

        vm.prank(creator);
        series.updateSaleConfig(0.2 ether, block.timestamp + 10, 0, 20);

        (, uint256 p1,, uint256 max1, uint256 start1, uint256 end1,,,) = series.getConfig();
        assertEq(p1, 0.2 ether);
        assertEq(max1, 20);
        assertEq(start1, block.timestamp + 10);
        assertEq(end1, 0);
    }

    function testUpdateSaleConfig_AfterFirstPurchase_OnlyTighten() public {
        _seedPoolMinimal();

        vm.prank(buyer);
        series.purchase{value: 0.1 ether}();
        assertTrue(series.isConfigLocked());

        // Price change should revert after first purchase.
        vm.prank(creator);
        vm.expectRevert(IJunkyardSeries.ConfigUpdateNotAllowed.selector);
        series.updateSaleConfig(0.2 ether, block.timestamp, 0, 10);

        // Max supply can be tightened (decreased) after first purchase.
        vm.prank(creator);
        series.updateSaleConfig(0.1 ether, block.timestamp, 0, 9);

        (,,, uint256 max1,,,,,) = series.getConfig();
        assertEq(max1, 9);
    }

    function testLeftoverPolicy_TightenAndSweep() public {
        address donation = address(0xBEEF);

        // Make series sell out after one purchase.
        vm.prank(creator);
        series.updateSaleConfig(0.1 ether, block.timestamp, 0, 1);

        // Seed pool with prizes.
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(prizePool), 200 ether);
        prizePool.depositERC20(address(prizeToken), 200 ether);
        prizePool.whitelistAsset(address(prizeNFT), true, 10_000);
        prizeNFT.approve(address(prizePool), 1);
        prizePool.depositERC721(address(prizeNFT), 1);
        prizeNFT.approve(address(prizePool), 2);
        prizePool.depositERC721(address(prizeNFT), 2);
        vm.stopPrank();

        // Configure leftover policy before purchase.
        vm.prank(creator);
        series.setLeftoverPolicy(uint8(IJunkyardSeries.LeftoverMode.DONATE), donation);

        // Purchase/open/claim the only box.
        vm.startPrank(buyer);
        uint256 boxId = series.purchase{value: 0.1 ether}();
        series.open(boxId);
        series.claim(boxId);
        vm.stopPrank();

        // Sweep remaining prizes to donation.
        uint256 donationBefore = prizeToken.balanceOf(donation);
        vm.prank(creator);
        series.sweepLeftovers();

        assertEq(prizePool.getPoolSize(), 0);
        assertEq(prizeToken.balanceOf(address(prizePool)), 0);
        assertGe(prizeToken.balanceOf(donation), donationBefore);
    }

    function testSweepLeftovers_RevertWhenNotAllClaimed() public {
        // Sell out after one purchase.
        vm.prank(creator);
        series.updateSaleConfig(0.1 ether, block.timestamp, 0, 1);

        _seedPoolMinimal();

        vm.prank(buyer);
        series.purchase{value: 0.1 ether}();

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.NotAllClaimed.selector, 1, 0));
        series.sweepLeftovers();
    }

    function testWhitelistAsset_RevertWhenAddingNewAssetAfterFirstPurchase() public {
        _seedPoolMinimal();

        vm.prank(buyer);
        series.purchase{value: 0.1 ether}();

        vm.prank(creator);
        vm.expectRevert(IJunkyardPrizePool.SeriesAssetSetLocked.selector);
        prizePool.whitelistAsset(address(prizeNFT), true, 10_000);
    }

    function testRestock_ExistingAssetAfterPoolEmpties_ReenablesPurchaseAndOpen() public {
        vm.startPrank(creator);
        prizePool.whitelistAsset(address(prizeNFT), true, 10_000);
        prizeNFT.approve(address(prizePool), 1);
        prizePool.depositERC721(address(prizeNFT), 1);
        vm.stopPrank();

        vm.startPrank(buyer);
        uint256 firstBoxId = series.purchase{value: 0.1 ether}();
        series.open(firstBoxId);
        series.claim(firstBoxId);
        vm.stopPrank();

        assertEq(prizePool.getPoolSize(), 0);

        vm.prank(buyer);
        vm.expectRevert(IJunkyardSeries.InsufficientPrizePool.selector);
        series.purchase{value: 0.1 ether}();

        vm.startPrank(creator);
        prizeNFT.approve(address(prizePool), 2);
        prizePool.depositERC721(address(prizeNFT), 2);
        vm.stopPrank();

        vm.startPrank(buyer);
        uint256 secondBoxId = series.purchase{value: 0.1 ether}();
        series.open(secondBoxId);
        vm.stopPrank();
    }

    function testPurchase_RevertWhenPaymentTokenTransfersLessThanQuotedPrice() public {
        FeeOnTransferERC20 paymentToken = new FeeOnTransferERC20("Fee Token", "FEE", 1000, address(0xBEEF));
        paymentToken.mint(buyer, 100 ether);

        globalConfig.setPaymentTokenWhitelist(address(paymentToken), true);

        JunkyardNFT nftImpl = new JunkyardNFT();
        JunkyardSeries seriesImpl = new JunkyardSeries();
        JunkyardPrizePool poolImpl = new JunkyardPrizePool();

        JunkyardNFT nft = JunkyardNFT(Clones.clone(address(nftImpl)));
        JunkyardSeries s = JunkyardSeries(payable(Clones.clone(address(seriesImpl))));
        JunkyardPrizePool pool = JunkyardPrizePool(Clones.clone(address(poolImpl)));

        nft.initialize("Fee Box", "FBOX", address(s), address(this));
        pool.initialize(address(s), 5);
        s.initialize(
            address(nft),
            address(pool),
            3,
            creator,
            100 ether,
            address(paymentToken),
            10,
            block.timestamp,
            0,
            address(configGuard),
            address(buyGuard),
            address(oracle),
            address(globalConfig)
        );
        nft.transferOwnership(address(s));

        vm.startPrank(creator);
        pool.whitelistAsset(address(prizeToken), true, 1000);
        prizeToken.approve(address(pool), 100 ether);
        pool.depositERC20(address(prizeToken), 100 ether);
        vm.stopPrank();

        vm.startPrank(buyer);
        paymentToken.approve(address(s), 100 ether);
        vm.expectRevert(abi.encodeWithSelector(IJunkyardSeries.UnexpectedPaymentReceived.selector, 100 ether, 90 ether));
        s.purchase();
        vm.stopPrank();
    }
}
