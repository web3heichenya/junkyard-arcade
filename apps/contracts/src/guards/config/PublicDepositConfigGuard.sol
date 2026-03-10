// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IConfigGuard} from "../../interfaces/IConfigGuard.sol";

/// @title PublicDepositConfigGuard
/// @notice Config guard that allows anyone to deposit but only creator to update configuration
/// @dev Used for community-funded series where deposits are open but config is restricted
/// @author Development Team
contract PublicDepositConfigGuard is IConfigGuard {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Check if caller is authorized to update configuration
    /// @param caller Address attempting the update
    /// @param creator Address of the series creator
    /// @return authorized True if caller is creator, false otherwise
    function checkConfigUpdate(address caller, address creator) external pure returns (bool authorized) {
        return caller == creator;
    }

    /// @notice Check if caller is authorized to deposit
    /// @param caller Address attempting the deposit (unused - anyone can deposit)
    /// @param creator Address of the series creator (unused)
    /// @return authorized Always returns true
    function checkDeposit(address caller, address creator) external pure returns (bool authorized) {
        return true;
    }
}
