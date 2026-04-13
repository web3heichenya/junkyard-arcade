// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {JunkyardNFT} from "../../src/core/JunkyardNFT.sol";
import {IJunkyardNFT} from "../../src/interfaces/IJunkyardNFT.sol";

/// @title JunkyardNFTTest
/// @notice Comprehensive tests for JunkyardNFT contract
contract JunkyardNFTTest is Test {
    // Test addresses
    address constant OWNER = address(0x1);
    address constant SERIES = address(0x2);
    address constant USER = address(0x3);

    JunkyardNFT public blindBoxNFT;

    function setUp() public {
        // Deploy implementation
        JunkyardNFT impl = new JunkyardNFT();

        // Deploy as clone for testing
        blindBoxNFT = JunkyardNFT(Clones.clone(address(impl)));
        blindBoxNFT.initialize("Test Blind Box", "TBB", SERIES, OWNER);
    }

    function testInitialize_Success() public view {
        assertEq(blindBoxNFT.name(), "Test Blind Box");
        assertEq(blindBoxNFT.symbol(), "TBB");
        assertEq(blindBoxNFT.seriesContract(), SERIES);
    }

    function testMint_Success() public {
        vm.prank(SERIES);
        uint256 tokenId = blindBoxNFT.mint(USER);

        assertEq(tokenId, 1);
        assertEq(blindBoxNFT.ownerOf(tokenId), USER);
        assertEq(blindBoxNFT.totalSupply(), 1);
    }

    function testMint_RevertWhenNotSeries() public {
        vm.prank(USER);
        vm.expectRevert(IJunkyardNFT.UnauthorizedCaller.selector);
        blindBoxNFT.mint(USER);
    }

    function testMint_MultipleMints() public {
        vm.startPrank(SERIES);
        uint256 tokenId1 = blindBoxNFT.mint(USER);
        uint256 tokenId2 = blindBoxNFT.mint(USER);
        vm.stopPrank();

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(blindBoxNFT.totalSupply(), 2);
    }

    function testBurn_Success() public {
        vm.prank(SERIES);
        uint256 tokenId = blindBoxNFT.mint(USER);

        vm.prank(SERIES);
        blindBoxNFT.burn(tokenId);

        vm.expectRevert();
        blindBoxNFT.ownerOf(tokenId);
    }

    function testBurn_RevertWhenNotSeries() public {
        vm.prank(SERIES);
        uint256 tokenId = blindBoxNFT.mint(USER);

        vm.prank(USER);
        vm.expectRevert(IJunkyardNFT.UnauthorizedCaller.selector);
        blindBoxNFT.burn(tokenId);
    }

    function testTransfer_RevertWhenAttemptingTransfer() public {
        vm.prank(SERIES);
        uint256 tokenId = blindBoxNFT.mint(USER);

        vm.prank(USER);
        vm.expectRevert(IJunkyardNFT.TransferNotAllowed.selector);
        blindBoxNFT.transferFrom(USER, address(0x999), tokenId);
    }

    function testTransfer_RevertOnSafeTransfer() public {
        vm.prank(SERIES);
        uint256 tokenId = blindBoxNFT.mint(USER);

        vm.prank(USER);
        vm.expectRevert(IJunkyardNFT.TransferNotAllowed.selector);
        blindBoxNFT.safeTransferFrom(USER, address(0x999), tokenId);
    }
}
