// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IBuyGuard} from "../../interfaces/IBuyGuard.sol";

/// @title TokenGateBuyGuard
/// @notice Buy guard that requires holding specific tokens to purchase
/// @dev Supports ERC20 balance requirements or ERC721 ownership requirements
/// @author Development Team
contract TokenGateBuyGuard is IBuyGuard {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when caller does not hold required ERC20 balance
    /// @param required Required token balance
    /// @param actual Actual token balance of caller
    error InsufficientERC20Balance(uint256 required, uint256 actual);

    /// @notice Error thrown when caller does not own required NFT
    error NFTNotOwned();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Token type: ERC20 or ERC721
    enum TokenType {
        ERC20,
        ERC721
    }

    /// @notice Type of gate token
    TokenType public immutable TOKEN_TYPE;

    /// @notice Address of the gate token contract
    address public immutable GATE_TOKEN;

    /// @notice Minimum required balance for ERC20 (0 for ERC721)
    uint256 public immutable REQUIRED_BALANCE;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the token gate guard
    /// @param tokenType Type of token (ERC20 or ERC721)
    /// @param gateToken Address of the gate token contract
    /// @param requiredBalance Minimum balance required for ERC20 (ignored for ERC721)
    constructor(TokenType tokenType, address gateToken, uint256 requiredBalance) {
        TOKEN_TYPE = tokenType;
        GATE_TOKEN = gateToken;
        REQUIRED_BALANCE = requiredBalance;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Check if buyer is authorized to purchase
    /// @param buyer Address attempting the purchase
    /// @param quantity Number being purchased (unused)
    /// @param creator Series creator (unused)
    /// @return authorized True if holds required tokens, false otherwise
    function checkBuy(address buyer, uint256 quantity, address creator) external view returns (bool authorized) {
        // quantity and creator not used but required by interface
        (quantity, creator);

        if (TOKEN_TYPE == TokenType.ERC20) {
            uint256 balance = IERC20(GATE_TOKEN).balanceOf(buyer);
            return balance >= REQUIRED_BALANCE;
        } else {
            uint256 balance = IERC721(GATE_TOKEN).balanceOf(buyer);
            return balance > 0;
        }
    }
}
