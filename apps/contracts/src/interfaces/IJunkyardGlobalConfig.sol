// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IJunkyardGlobalConfig
/// @notice Interface for the global configuration contract
/// @dev Defines protocol-wide settings and implementation management
interface IJunkyardGlobalConfig {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when protocol fee BPS exceeds maximum (10000)
    /// @param providedBps The invalid BPS value provided
    error InvalidProtocolFeeBps(uint256 providedBps);

    /// @notice Error thrown when attempting to use non-whitelisted oracle
    /// @param oracle Address of the oracle
    error OracleNotWhitelisted(address oracle);

    /// @notice Error thrown when attempting to use non-whitelisted payment token
    /// @param token Address of the payment token
    error PaymentTokenNotWhitelisted(address token);

    /// @notice Error thrown when attempting to use non-whitelisted guard
    /// @param guard Address of the guard contract
    error GuardNotWhitelisted(address guard);

    /// @notice Error thrown when a non-zero protocol fee uses a zero fee recipient
    error InvalidFeeRecipient();

    /// @notice Error thrown when an implementation address is zero or not a deployed contract
    /// @param implementation Address that failed validation
    error InvalidImplementation(address implementation);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when protocol fee configuration is updated
    /// @param feeBps New protocol fee in basis points
    /// @param feeRecipient New fee recipient address
    event ProtocolFeeUpdated(uint256 feeBps, address indexed feeRecipient);

    /// @notice Emitted when an oracle whitelist status changes
    /// @param oracle Address of the oracle
    /// @param whitelisted New whitelist status
    event OracleWhitelistUpdated(address indexed oracle, bool whitelisted);

    /// @notice Emitted when a payment token whitelist status changes
    /// @param token Address of the payment token
    /// @param whitelisted New whitelist status
    event PaymentTokenWhitelistUpdated(address indexed token, bool whitelisted);

    /// @notice Emitted when a guard whitelist status changes
    /// @param guard Address of the guard contract
    /// @param whitelisted New whitelist status
    event GuardWhitelistUpdated(address indexed guard, bool whitelisted);

    /// @notice Emitted when an implementation is updated
    /// @param implType Type of implementation ("series" or "nft")
    /// @param implementation New implementation address
    event ImplementationUpdated(string indexed implType, address indexed implementation);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get protocol fee configuration
    /// @return feeBps Protocol fee in basis points (max 10000 = 100%)
    /// @return feeRecipient Address receiving protocol fees
    function getProtocolFee() external view returns (uint256 feeBps, address feeRecipient);

    /// @notice Check if an oracle is whitelisted
    /// @param oracle Address of the oracle to check
    /// @return whitelisted True if oracle is whitelisted
    function isOracleWhitelisted(address oracle) external view returns (bool whitelisted);

    /// @notice Check if a payment token is whitelisted
    /// @param token Address of the token to check (address(0) for native token)
    /// @return whitelisted True if token is whitelisted
    function isPaymentTokenWhitelisted(address token) external view returns (bool whitelisted);

    /// @notice Check if a guard contract is whitelisted
    /// @param guard Address of the guard to check
    /// @return whitelisted True if guard is whitelisted
    function isGuardWhitelisted(address guard) external view returns (bool whitelisted);

    /// @notice Get current series implementation address
    /// @return implementation Address of series implementation
    function seriesImplementation() external view returns (address implementation);

    /// @notice Get current NFT implementation address
    /// @return implementation Address of NFT implementation
    function nftImplementation() external view returns (address implementation);

    /// @notice Get current prize pool implementation address
    /// @return implementation Address of prize pool implementation
    function prizePoolImplementation() external view returns (address implementation);
}
