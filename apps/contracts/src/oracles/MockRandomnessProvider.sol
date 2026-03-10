// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IRandomnessProvider} from "../interfaces/IRandomnessProvider.sol";

/// @title MockRandomnessProvider
/// @notice Mock randomness provider for testing purposes
/// @dev Provides pseudo-random numbers without actual VRF for local development
/// @author Development Team
contract MockRandomnessProvider is IRandomnessProvider {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mapping from request ID to randomness value
    mapping(bytes32 => uint256) private _randomness;

    /// @notice Mapping from request ID to fulfillment status
    mapping(bytes32 => bool) private _fulfilled;

    /// @notice Counter for generating unique request IDs
    uint256 private _requestCounter;

    /// @notice Configurable mock request price for exercising direct-funding flows in tests
    uint256 private _requestPrice;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Request a random number
    /// @dev Immediately fulfills with pseudo-random number for testing
    /// @return requestId Unique ID for tracking this request
    function requestRandomness() external payable returns (bytes32 requestId) {
        require(msg.value >= _requestPrice, "mock fee too low");

        unchecked {
            ++_requestCounter;
        }

        // Generate pseudo-random request ID
        requestId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _requestCounter));

        // Generate pseudo-random number (NOT SECURE - only for testing)
        uint256 randomness =
            uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, _requestCounter)));

        _randomness[requestId] = randomness;
        _fulfilled[requestId] = true;

        emit RandomnessRequested(requestId, msg.sender);
        emit RandomnessFulfilled(requestId, randomness);
    }

    function setRequestPrice(uint256 requestPrice) external {
        _requestPrice = requestPrice;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the random number for a fulfilled request
    /// @param requestId ID of the request
    /// @return randomness The random number (0 if not yet fulfilled)
    function getRandomness(bytes32 requestId) external view returns (uint256 randomness) {
        return _randomness[requestId];
    }

    function getRequestPrice() external view returns (uint256 price) {
        return _requestPrice;
    }

    function estimateRequestPrice(uint256) external view returns (uint256 price) {
        return _requestPrice;
    }

    /// @notice Check if a request has been fulfilled
    /// @param requestId ID of the request
    /// @return fulfilled True if request has been fulfilled
    function isFulfilled(bytes32 requestId) external view returns (bool fulfilled) {
        return _fulfilled[requestId];
    }
}
