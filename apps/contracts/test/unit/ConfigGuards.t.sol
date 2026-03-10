// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {OwnerConfigGuard} from "../../src/guards/config/OwnerConfigGuard.sol";
import {PublicDepositConfigGuard} from "../../src/guards/config/PublicDepositConfigGuard.sol";
import {IConfigGuard} from "../../src/interfaces/IConfigGuard.sol";

/// @title ConfigGuardTest
/// @notice Tests for Config Guard implementations
contract ConfigGuardTest is Test {
    // Test addresses
    address constant CREATOR = address(0x1);
    address constant OTHER = address(0x2);

    OwnerConfigGuard public ownerGuard;
    PublicDepositConfigGuard public publicGuard;

    function setUp() public {
        ownerGuard = new OwnerConfigGuard();
        publicGuard = new PublicDepositConfigGuard();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  OWNER CONFIG GUARD TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testOwnerGuard_CheckConfigUpdate_SuccessWhenCreator() public {
        bool authorized = ownerGuard.checkConfigUpdate(CREATOR, CREATOR);
        assertTrue(authorized);
    }

    function testOwnerGuard_CheckConfigUpdate_RevertWhenNotCreator() public {
        bool authorized = ownerGuard.checkConfigUpdate(OTHER, CREATOR);
        assertFalse(authorized);
    }

    function testOwnerGuard_CheckDeposit_SuccessWhenCreator() public {
        bool authorized = ownerGuard.checkDeposit(CREATOR, CREATOR);
        assertTrue(authorized);
    }

    function testOwnerGuard_CheckDeposit_RevertWhenNotCreator() public {
        bool authorized = ownerGuard.checkDeposit(OTHER, CREATOR);
        assertFalse(authorized);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*               PUBLIC DEPOSIT GUARD TESTS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testPublicGuard_CheckConfigUpdate_SuccessWhenCreator() public {
        bool authorized = publicGuard.checkConfigUpdate(CREATOR, CREATOR);
        assertTrue(authorized);
    }

    function testPublicGuard_CheckConfigUpdate_RevertWhenNotCreator() public {
        bool authorized = publicGuard.checkConfigUpdate(OTHER, CREATOR);
        assertFalse(authorized);
    }

    function testPublicGuard_CheckDeposit_SuccessForAnyone() public {
        bool authorized = publicGuard.checkDeposit(CREATOR, CREATOR);
        assertTrue(authorized);
        authorized = publicGuard.checkDeposit(OTHER, CREATOR);
        assertTrue(authorized);
        authorized = publicGuard.checkDeposit(address(0x999), CREATOR);
        assertTrue(authorized);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      FUZZ TESTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function testFuzz_OwnerGuard_OnlyCreatorCanUpdateConfig(address caller, address creator) public {
        vm.assume(caller != creator);

        bool authorized = ownerGuard.checkConfigUpdate(caller, creator);

        if (caller == creator) {
            assertTrue(authorized);
        } else {
            assertFalse(authorized);
        }
    }

    function testFuzz_PublicGuard_AnyoneCanDeposit(address caller, address creator) public view {
        publicGuard.checkDeposit(caller, creator);
    }
}
