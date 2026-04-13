// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IConfigGuard
/// @notice Interface for configuration guard contracts
/// @dev Guards validate permissions for configuration updates and deposits
interface IConfigGuard {
    /*´:°•.°+•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Check if caller is authorized to update configuration
    /// @param caller Address attempting the update
    /// @param creator Address of the series creator
    /// @return authorized True if authorized, false otherwise
    function checkConfigUpdate(address caller, address creator) external view returns (bool authorized);

    /// @notice Check if caller is authorized to deposit
    /// @param caller Address attempting the deposit
    /// @param creator Address of the series creator
    /// @return authorized True if authorized, false otherwise
    function checkDeposit(address caller, address creator) external view returns (bool authorized);
}
