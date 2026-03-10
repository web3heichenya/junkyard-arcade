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
import "../mocks/MaliciousERC721.sol";
import "../mocks/ReentrantERC777.sol";

contract MockSeriesForPoolAuth {
    address public immutable CREATOR;
    address public immutable CONFIG_GUARD;

    constructor(address creator, address configGuard) {
        CREATOR = creator;
        CONFIG_GUARD = configGuard;
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

    function isConfigLocked() external pure returns (bool) {
        return false;
    }
}

contract PrizePoolSecurityTest is Test, IERC1155Receiver {
    JunkyardPrizePool public pool;
    JunkyardPrizePool public poolImpl;

    MockERC20 public token;
    MockERC721 public nft;
    MaliciousERC721 public maliciousNFT;
    ReentrantERC777 public reentrantToken;

    address public series;
    address public attacker = address(0x6666);
    address public user = address(0x5678);
    MockSeriesForPoolAuth public mockSeries;

    function setUp() public {
        mockSeries = new MockSeriesForPoolAuth(address(this), address(0));
        series = address(mockSeries);

        // Deploy pool
        poolImpl = new JunkyardPrizePool();
        pool = JunkyardPrizePool(Clones.clone(address(poolImpl)));
        pool.initialize(series, 5);

        // Deploy tokens
        token = new MockERC20("Prize Token", "PRIZE", 18);
        nft = new MockERC721("Prize NFT", "PNFT");

        // Approve
        token.mint(address(this), 10_000 ether);
        token.approve(address(pool), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                    REENTRANCY TESTS
    //////////////////////////////////////////////////////////////*/

    function testReentrancyProtection_DistributePrize() public {
        // Deploy malicious ERC777 that attempts reentrancy
        reentrantToken = new ReentrantERC777(address(pool), series);

        pool.whitelistAsset(address(reentrantToken), true, 1000);

        // Deposit from reentrant token
        reentrantToken.mint(address(this), 1000 ether);
        reentrantToken.approve(address(pool), type(uint256).max);
        pool.depositERC20(address(reentrantToken), 1000 ether);

        // Attempt distribution (should not allow reentrancy)
        vm.prank(series);
        pool.distributePrize(attacker, 12_345);

        // Verify only one distribution occurred
        assertLe(reentrantToken.balanceOf(attacker), 100 ether); // Configured max 10%
    }

    /*//////////////////////////////////////////////////////////////
                    MALICIOUS CONTRACT TESTS
    //////////////////////////////////////////////////////////////*/

    function testMaliciousERC721_OwnerOfReverts() public {
        maliciousNFT = new MaliciousERC721();
        pool.whitelistAsset(address(maliciousNFT), true, 10_000);

        // Deposit normal NFT
        maliciousNFT.mint(address(this), 1);
        maliciousNFT.setApprovalForAll(address(pool), true);
        pool.depositERC721(address(maliciousNFT), 1);

        // Make ownerOf revert
        maliciousNFT.setShouldRevert(true);

        // Sync should handle gracefully with try-catch
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = 1;

        // Should not revert the entire transaction
        pool.syncNFTBalance(address(maliciousNFT), tokenIds);
    }

    /*//////////////////////////////////////////////////////////////
                    ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function testOnlySeries_DistributePrize() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        // Non-series address should fail
        vm.prank(attacker);
        vm.expectRevert(); // Should revert with OnlySeries error
        pool.distributePrize(user, 12_345);
    }

    function testAnyone_CanSync() public {
        pool.whitelistAsset(address(token), true, 1000);
        pool.depositERC20(address(token), 1000 ether);

        // Anyone should be able to call sync
        vm.prank(attacker);
        pool.syncFTBalance(address(token));

        vm.prank(user);
        pool.syncFTBalance(address(token));
    }

    /*//////////////////////////////////////////////////////////////
                    GAS GRIEFING TESTS
    //////////////////////////////////////////////////////////////*/

    function testGasGrief_ManyAssetTypes() public {
        // Register many asset types
        for (uint256 i = 1; i <= 20; i++) {
            MockERC721 newNFT = new MockERC721("NFT", "NFT");
            newNFT.mint(address(this), 1);
            newNFT.setApprovalForAll(address(pool), true);
            pool.whitelistAsset(address(newNFT), true, 10_000);
            pool.depositERC721(address(newNFT), 1);
        }

        // Distribution should still be reasonable
        uint256 gasBefore = gasleft();
        vm.prank(series);
        pool.distributePrize(user, 99_999);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be under 500k gas even with 20 types
        assertLt(gasUsed, 500_000);
    }

    /*//////////////////////////////////////////////////////////////
                    INTEGER BOUNDARY TESTS
    //////////////////////////////////////////////////////////////*/

    function testIntegerOverflow_LargeERC20Balance() public {
        pool.whitelistAsset(address(token), true, 1000);

        // Deposit very large amount (but not max to avoid actual overflow)
        uint256 largeAmount = type(uint128).max;
        token.mint(address(this), largeAmount);
        pool.depositERC20(address(token), largeAmount);

        // Distribution should handle percentage calc without overflow
        vm.prank(series);
        IJunkyardSeries.PoolAsset[] memory prizes = pool.distributePrize(user, 54_321);

        // Should succeed and give reasonable amount
        assertGt(prizes[0].amount, 0);
        assertLe(prizes[0].amount, largeAmount / 10); // Configured max 10%
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
}
