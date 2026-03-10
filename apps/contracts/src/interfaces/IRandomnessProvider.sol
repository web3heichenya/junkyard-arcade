// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IRandomnessProvider
/// @notice Interface for randomness providers (Chainlink VRF, etc.)
/// @dev Implementing contracts provide verifiable random numbers
interface IRandomnessProvider {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when randomness is requested
    /// @param requestId Unique ID for the randomness request
    /// @param requester Address requesting randomness
    event RandomnessRequested(bytes32 indexed requestId, address indexed requester);

    /// @notice Emitted when randomness is fulfilled
    /// @param requestId ID of the fulfilled request
    /// @param randomness The random number provided
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 randomness);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Request a random number
    /// @dev Implementation-specific parameters may be required
    /// @return requestId Unique ID for tracking this request
    function requestRandomness() external payable returns (bytes32 requestId);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the random number for a fulfilled request
    /// @param requestId ID of the request
    /// @return randomness The random number (0 if not yet fulfilled)
    function getRandomness(bytes32 requestId) external view returns (uint256 randomness);

    /// @notice Get the request price for the current transaction gas price
    /// @dev Direct-funding providers may charge a dynamic native fee; mocks may return 0
    function getRequestPrice() external view returns (uint256 price);

    /// @notice Estimate the request price for a specific gas price
    /// @param gasPriceWei Gas price to use for estimation
    function estimateRequestPrice(uint256 gasPriceWei) external view returns (uint256 price);

    /// @notice Check if a request has been fulfilled
    /// @param requestId ID of the request
    /// @return fulfilled True if request has been fulfilled
    function isFulfilled(bytes32 requestId) external view returns (bool fulfilled);
}
