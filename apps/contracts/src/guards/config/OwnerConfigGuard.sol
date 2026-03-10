// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IConfigGuard} from "../../interfaces/IConfigGuard.sol";

/// @title OwnerConfigGuard
/// @notice Config guard that only allows the series creator to update configuration and deposit assets
/// @dev Default guard for private series - most restrictive option
/// @author Development Team
contract OwnerConfigGuard is IConfigGuard {
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
    /// @param caller Address attempting the deposit
    /// @param creator Address of the series creator
    /// @return authorized True if caller is creator, false otherwise
    function checkDeposit(address caller, address creator) external pure returns (bool authorized) {
        return caller == creator;
    }
}
