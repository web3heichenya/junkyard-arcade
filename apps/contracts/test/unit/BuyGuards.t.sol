// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {OpenBuyGuard} from "../../src/guards/buy/OpenBuyGuard.sol";
import {TokenGateBuyGuard} from "../../src/guards/buy/TokenGateBuyGuard.sol";
import {IBuyGuard} from "../../src/interfaces/IBuyGuard.sol";

/// @title MockERC20
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title MockERC721
contract MockERC721 is ERC721 {
    uint256 private _nextTokenId = 1;

    constructor() ERC721("Mock NFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }
}

/// @title BuyGuardTest
/// @notice Tests for Buy Guard implementations
contract BuyGuardTest is Test {
    // Test addresses
    address constant BUYER = address(0x1);
    address constant OTHER = address(0x2);
    address constant CREATOR = address(0x3);

    OpenBuyGuard public openGuard;
    TokenGateBuyGuard public erc20GateGuard;
    TokenGateBuyGuard public erc721GateGuard;

    MockERC20 public token;
    MockERC721 public nft;

    function setUp() public {
        openGuard = new OpenBuyGuard();
        token = new MockERC20();
        nft = new MockERC721();

        // Create ERC20 gate guard (requires 100 tokens)
        erc20GateGuard = new TokenGateBuyGuard(TokenGateBuyGuard.TokenType.ERC20, address(token), 100 ether);

        // Create ERC721 gate guard
        erc721GateGuard = new TokenGateBuyGuard(TokenGateBuyGuard.TokenType.ERC721, address(nft), 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   OPEN BUY GUARD TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testOpenGuard_AllowsAnyPurchase() public view {
        bool authorized = openGuard.checkBuy(BUYER, 1, CREATOR);
        assertTrue(authorized);

        authorized = openGuard.checkBuy(OTHER, 1, CREATOR);
        assertTrue(authorized);

        authorized = openGuard.checkBuy(address(0x999), 1, CREATOR);
        assertTrue(authorized);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                ERC20 GATE GUARD TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testERC20Gate_AllowsWhenHoldingERC20() public {
        token.mint(BUYER, 100 ether);
        bool authorized = erc20GateGuard.checkBuy(BUYER, 1, CREATOR);
        assertTrue(authorized);
    }

    function testERC20Gate_RevertsWhenInsufficientBalance() public {
        token.mint(BUYER, 50 ether);
        bool authorized = erc20GateGuard.checkBuy(BUYER, 1, CREATOR);
        assertFalse(authorized);
    }

    function testERC20Gate_RevertsWhenZeroBalance() public view {
        bool authorized = erc20GateGuard.checkBuy(BUYER, 1, CREATOR);
        assertFalse(authorized);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                ERC721 GATE GUARD TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testERC721Gate_SuccessWhenOwnsNFT() public {
        nft.mint(BUYER);
        erc721GateGuard.checkBuy(BUYER, 1, CREATOR);
    }

    function testERC721Gate_RevertWhenNoNFT() public view {
        bool authorized = erc721GateGuard.checkBuy(BUYER, 1, CREATOR);
        assertFalse(authorized);
    }

    function testERC721Gate_SuccessWithMultipleNFTs() public {
        nft.mint(BUYER);
        nft.mint(BUYER);
        nft.mint(BUYER);
        erc721GateGuard.checkBuy(BUYER, 1, CREATOR);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      FUZZ TESTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testFuzz_OpenGuard_AlwaysAllows(address caller, uint256 seriesId, uint256 /* purchases */ ) public view {
        openGuard.checkBuy(caller, seriesId, CREATOR);
    }

    function testFuzz_ERC20Gate_RequiresBalance(address caller, uint256 balance) public {
        vm.assume(caller != address(0)); // ERC20 can't mint to address(0)
        vm.assume(caller.code.length == 0); // Not a contract
        balance = bound(balance, 0, 1000 ether);
        token.mint(caller, balance);

        bool authorized = erc20GateGuard.checkBuy(caller, 1, CREATOR);

        if (balance >= 100 ether) {
            assertTrue(authorized);
        } else {
            assertFalse(authorized);
        }
    }
}
