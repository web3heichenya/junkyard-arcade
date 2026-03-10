// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IBuyGuard
/// @notice Interface for buy guard contracts
/// @dev Guards validate purchase permissions
interface IBuyGuard {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when purchase limit exceeded for address
    /// @param currentPurchases Current number of purchases by address
    /// @param limit Maximum allowed purchases per address
    error PurchaseLimitExceeded(uint256 currentPurchases, uint256 limit);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Check if buyer is authorized to purchase
    /// @param buyer Address attempting the purchase
    /// @param quantity Number of boxes being purchased
    /// @param creator Address of the series creator
    /// @return authorized True if authorized, false otherwise
    function checkBuy(address buyer, uint256 quantity, address creator) external view returns (bool authorized);
}
