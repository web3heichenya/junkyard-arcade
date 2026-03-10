// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IJunkyardGlobalConfig} from "../interfaces/IJunkyardGlobalConfig.sol";

/// @title JunkyardGlobalConfig
/// @notice Central configuration contract for the Junkyard Arcade protocol
/// @dev Manages protocol-wide settings and implementation addresses
/// @author Development Team
contract JunkyardGlobalConfig is IJunkyardGlobalConfig, Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Protocol fee in basis points (max 10000 = 100%)
    uint256 private _protocolFeeBps;

    /// @notice Address receiving protocol fees
    address private _feeRecipient;

    /// @notice Current series implementation address
    address public seriesImplementation;

    /// @notice Current NFT implementation address
    address public nftImplementation;

    /// @notice Current prize pool implementation address
    address public prizePoolImplementation;

    /// @notice Mapping of oracle addresses to whitelist status
    mapping(address => bool) private _whitelistedOracles;

    /// @notice Mapping of payment token addresses to whitelist status
    mapping(address => bool) private _whitelistedPaymentTokens;

    /// @notice Mapping of guard contract addresses to whitelist status
    mapping(address => bool) private _whitelistedGuards;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTANTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Maximum protocol fee basis points (100%)
    uint256 public constant MAX_PROTOCOL_FEE_BPS = 10_000;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the JunkyardGlobalConfig contract
    /// @param initialOwner Address of the contract owner
    /// @param initialFeeBps Initial protocol fee in basis points
    /// @param initialFeeRecipient Initial fee recipient address
    /// @param seriesImpl Initial series implementation address
    /// @param nftImpl Initial NFT implementation address
    constructor(
        address initialOwner,
        uint256 initialFeeBps,
        address initialFeeRecipient,
        address seriesImpl,
        address nftImpl,
        address prizePoolImpl
    )
        Ownable(initialOwner)
    {
        if (initialFeeBps > MAX_PROTOCOL_FEE_BPS) {
            revert InvalidProtocolFeeBps(initialFeeBps);
        }
        _validateFeeConfig(initialFeeBps, initialFeeRecipient);
        _validateImplementation(seriesImpl);
        _validateImplementation(nftImpl);
        _validateImplementation(prizePoolImpl);

        _protocolFeeBps = initialFeeBps;
        _feeRecipient = initialFeeRecipient;

        // Whitelist native token (address(0)) by default
        _whitelistedPaymentTokens[address(0)] = true;
        emit PaymentTokenWhitelistUpdated(address(0), true);

        // Set initial implementations
        seriesImplementation = seriesImpl;
        nftImplementation = nftImpl;
        prizePoolImplementation = prizePoolImpl;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ADMIN FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set protocol fee configuration
    /// @dev Only callable by owner
    /// @param feeBps Protocol fee in basis points (max 10000)
    /// @param feeRecipient Address to receive protocol fees
    function setProtocolFee(uint256 feeBps, address feeRecipient) external onlyOwner {
        if (feeBps > MAX_PROTOCOL_FEE_BPS) {
            revert InvalidProtocolFeeBps(feeBps);
        }
        _validateFeeConfig(feeBps, feeRecipient);
        _protocolFeeBps = feeBps;
        _feeRecipient = feeRecipient;
        emit ProtocolFeeUpdated(feeBps, feeRecipient);
    }

    /// @notice Update oracle whitelist status
    /// @dev Only callable by owner
    /// @param oracle Address of the oracle
    /// @param whitelisted New whitelist status
    function setOracleWhitelist(address oracle, bool whitelisted) external onlyOwner {
        _whitelistedOracles[oracle] = whitelisted;
        emit OracleWhitelistUpdated(oracle, whitelisted);
    }

    /// @notice Update payment token whitelist status
    /// @dev Only callable by owner
    /// @param token Address of the payment token (address(0) for native token)
    /// @param whitelisted New whitelist status
    function setPaymentTokenWhitelist(address token, bool whitelisted) external onlyOwner {
        _whitelistedPaymentTokens[token] = whitelisted;
        emit PaymentTokenWhitelistUpdated(token, whitelisted);
    }

    /// @notice Update guard contract whitelist status
    /// @dev Only callable by owner
    /// @param guard Address of the guard contract
    /// @param whitelisted New whitelist status
    function setGuardWhitelist(address guard, bool whitelisted) external onlyOwner {
        _whitelistedGuards[guard] = whitelisted;
        emit GuardWhitelistUpdated(guard, whitelisted);
    }

    /// @notice Update series implementation
    /// @dev Only callable by owner
    /// @param newImplementation Address of the new series implementation
    function updateSeriesImplementation(address newImplementation) external onlyOwner {
        _validateImplementation(newImplementation);
        seriesImplementation = newImplementation;
        emit ImplementationUpdated("series", newImplementation);
    }

    /// @notice Update NFT implementation
    /// @dev Only callable by owner
    /// @param newImplementation Address of the new NFT implementation
    function updateNFTImplementation(address newImplementation) external onlyOwner {
        _validateImplementation(newImplementation);
        nftImplementation = newImplementation;
        emit ImplementationUpdated("nft", newImplementation);
    }

    /// @notice Update prize pool implementation
    /// @dev Only callable by owner
    /// @param newImplementation Address of the new prize pool implementation
    function updatePrizePoolImplementation(address newImplementation) external onlyOwner {
        _validateImplementation(newImplementation);
        prizePoolImplementation = newImplementation;
        emit ImplementationUpdated("prizePool", newImplementation);
    }

    function _validateFeeConfig(uint256 feeBps, address feeRecipient) private pure {
        if (feeBps > 0 && feeRecipient == address(0)) {
            revert InvalidFeeRecipient();
        }
    }

    function _validateImplementation(address implementation) private view {
        if (implementation == address(0) || implementation.code.length == 0) {
            revert InvalidImplementation(implementation);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get protocol fee configuration
    /// @return feeBps Protocol fee in basis points (max 10000 = 100%)
    /// @return feeRecipient Address receiving protocol fees
    function getProtocolFee() external view returns (uint256 feeBps, address feeRecipient) {
        return (_protocolFeeBps, _feeRecipient);
    }

    /// @notice Check if an oracle is whitelisted
    /// @param oracle Address of the oracle to check
    /// @return whitelisted True if oracle is whitelisted
    function isOracleWhitelisted(address oracle) external view returns (bool whitelisted) {
        return _whitelistedOracles[oracle];
    }

    /// @notice Check if a payment token is whitelisted
    /// @param token Address of the token to check (address(0) for native token)
    /// @return whitelisted True if token is whitelisted
    function isPaymentTokenWhitelisted(address token) external view returns (bool whitelisted) {
        return _whitelistedPaymentTokens[token];
    }

    /// @notice Check if a guard contract is whitelisted
    /// @param guard Address of the guard to check
    /// @return whitelisted True if guard is whitelisted
    function isGuardWhitelisted(address guard) external view returns (bool whitelisted) {
        return _whitelistedGuards[guard];
    }
}
