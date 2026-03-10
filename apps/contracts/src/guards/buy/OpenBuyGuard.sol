// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IBuyGuard} from "../../interfaces/IBuyGuard.sol";

/// @title OpenBuyGuard
/// @notice Buy guard that allows anyone to purchase blind boxes
/// @dev Default guard for public series - no restrictions on purchases
/// @author Development Team
contract OpenBuyGuard is IBuyGuard {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Check if buyer is authorized to purchase
    /// @return authorized Always returns true
    function checkBuy(
        address, /* buyer */
        uint256, /* quantity */
        address /* creator */
    )
        external
        pure
        returns (bool authorized)
    {
        return true;
    }
}
