// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {JunkyardGlobalConfig} from "../../src/core/JunkyardGlobalConfig.sol";
import {JunkyardSeries} from "../../src/core/JunkyardSeries.sol";
import {JunkyardNFT} from "../../src/core/JunkyardNFT.sol";
import {JunkyardPrizePool} from "../../src/core/JunkyardPrizePool.sol";
import {IJunkyardGlobalConfig} from "../../src/interfaces/IJunkyardGlobalConfig.sol";

/// @title JunkyardGlobalConfigTest
/// @notice Unit tests for JunkyardGlobalConfig contract
contract JunkyardGlobalConfigTest is Test {
    // Test constants
    address constant ALICE = address(0x1);
    address constant BOB = address(0x2);
    address constant ORACLE = address(0x3);
    address constant TOKEN = address(0x4);
    address constant GUARD = address(0x5);

    // Contract instances
    JunkyardGlobalConfig public globalConfig;
    address public seriesImpl;
    address public nftImpl;
    address public prizePoolImpl;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          SETUP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setUp() public {
        seriesImpl = address(new JunkyardSeries());
        nftImpl = address(new JunkyardNFT());
        prizePoolImpl = address(new JunkyardPrizePool());

        globalConfig = new JunkyardGlobalConfig(address(this), 250, ALICE, seriesImpl, nftImpl, prizePoolImpl); // 2.5% fee
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PROTOCOL FEE TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testConstructor_Success() public view {
        (uint256 feeBps, address feeRecipient) = globalConfig.getProtocolFee();
        assertEq(feeBps, 250);
        assertEq(feeRecipient, ALICE);
    }

    function testConstructor_RevertWhenFeeTooHigh() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidProtocolFeeBps.selector, 10_001));
        new JunkyardGlobalConfig(address(this), 10_001, ALICE, seriesImpl, nftImpl, prizePoolImpl);
    }

    function testConstructor_RevertWhenFeeRecipientIsZeroAndFeeNonZero() public {
        vm.expectRevert(IJunkyardGlobalConfig.InvalidFeeRecipient.selector);
        new JunkyardGlobalConfig(address(this), 250, address(0), seriesImpl, nftImpl, prizePoolImpl);
    }

    function testConstructor_RevertWhenImplementationIsNotContract() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidImplementation.selector, BOB));
        new JunkyardGlobalConfig(address(this), 250, ALICE, BOB, nftImpl, prizePoolImpl);
    }

    function testSetProtocolFee_Success() public {
        globalConfig.setProtocolFee(500, BOB);

        (uint256 feeBps, address feeRecipient) = globalConfig.getProtocolFee();
        assertEq(feeBps, 500);
        assertEq(feeRecipient, BOB);
    }

    function testSetProtocolFee_RevertWhenNotOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        globalConfig.setProtocolFee(500, BOB);
    }

    function testSetProtocolFee_RevertWhenFeeTooHigh() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidProtocolFeeBps.selector, 10_001));
        globalConfig.setProtocolFee(10_001, BOB);
    }

    function testSetProtocolFee_RevertWhenRecipientIsZeroAndFeeNonZero() public {
        vm.expectRevert(IJunkyardGlobalConfig.InvalidFeeRecipient.selector);
        globalConfig.setProtocolFee(1, address(0));
    }

    function testSetProtocolFee_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IJunkyardGlobalConfig.ProtocolFeeUpdated(500, BOB);
        globalConfig.setProtocolFee(500, BOB);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   ORACLE WHITELIST TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testSetOracleWhitelist_Success() public {
        assertFalse(globalConfig.isOracleWhitelisted(ORACLE));

        globalConfig.setOracleWhitelist(ORACLE, true);
        assertTrue(globalConfig.isOracleWhitelisted(ORACLE));

        globalConfig.setOracleWhitelist(ORACLE, false);
        assertFalse(globalConfig.isOracleWhitelisted(ORACLE));
    }

    function testSetOracleWhitelist_RevertWhenNotOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        globalConfig.setOracleWhitelist(ORACLE, true);
    }

    function testSetOracleWhitelist_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IJunkyardGlobalConfig.OracleWhitelistUpdated(ORACLE, true);
        globalConfig.setOracleWhitelist(ORACLE, true);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                PAYMENT TOKEN WHITELIST TESTS              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testPaymentTokenWhitelist_NativeTokenWhitelistedByDefault() public view {
        assertTrue(globalConfig.isPaymentTokenWhitelisted(address(0)));
    }

    function testSetPaymentTokenWhitelist_Success() public {
        assertFalse(globalConfig.isPaymentTokenWhitelisted(TOKEN));

        globalConfig.setPaymentTokenWhitelist(TOKEN, true);
        assertTrue(globalConfig.isPaymentTokenWhitelisted(TOKEN));

        globalConfig.setPaymentTokenWhitelist(TOKEN, false);
        assertFalse(globalConfig.isPaymentTokenWhitelisted(TOKEN));
    }

    function testSetPaymentTokenWhitelist_RevertWhenNotOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        globalConfig.setPaymentTokenWhitelist(TOKEN, true);
    }

    function testSetPaymentTokenWhitelist_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IJunkyardGlobalConfig.PaymentTokenWhitelistUpdated(TOKEN, true);
        globalConfig.setPaymentTokenWhitelist(TOKEN, true);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  GUARD WHITELIST TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testSetGuardWhitelist_Success() public {
        assertFalse(globalConfig.isGuardWhitelisted(GUARD));

        globalConfig.setGuardWhitelist(GUARD, true);
        assertTrue(globalConfig.isGuardWhitelisted(GUARD));

        globalConfig.setGuardWhitelist(GUARD, false);
        assertFalse(globalConfig.isGuardWhitelisted(GUARD));
    }

    function testSetGuardWhitelist_RevertWhenNotOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        globalConfig.setGuardWhitelist(GUARD, true);
    }

    function testSetGuardWhitelist_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IJunkyardGlobalConfig.GuardWhitelistUpdated(GUARD, true);
        globalConfig.setGuardWhitelist(GUARD, true);
    }

    function testUpdateSeriesImplementation_RevertWhenImplementationIsZero() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidImplementation.selector, address(0)));
        globalConfig.updateSeriesImplementation(address(0));
    }

    function testUpdateSeriesImplementation_RevertWhenImplementationIsEOA() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidImplementation.selector, BOB));
        globalConfig.updateSeriesImplementation(BOB);
    }

    function testUpdateNFTImplementation_RevertWhenImplementationIsEOA() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidImplementation.selector, BOB));
        globalConfig.updateNFTImplementation(BOB);
    }

    function testUpdatePrizePoolImplementation_RevertWhenImplementationIsEOA() public {
        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidImplementation.selector, BOB));
        globalConfig.updatePrizePoolImplementation(BOB);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      FUZZ TESTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testFuzz_SetProtocolFee(uint256 feeBps, address recipient) public {
        feeBps = bound(feeBps, 0, 10_000);
        vm.assume(recipient != address(0));

        globalConfig.setProtocolFee(feeBps, recipient);

        (uint256 actualFeeBps, address actualRecipient) = globalConfig.getProtocolFee();
        assertEq(actualFeeBps, feeBps);
        assertEq(actualRecipient, recipient);
    }

    function testFuzz_SetProtocolFee_RevertWhenTooHigh(uint256 feeBps) public {
        feeBps = bound(feeBps, 10_001, type(uint256).max);

        vm.expectRevert(abi.encodeWithSelector(IJunkyardGlobalConfig.InvalidProtocolFeeBps.selector, feeBps));
        globalConfig.setProtocolFee(feeBps, ALICE);
    }
}
