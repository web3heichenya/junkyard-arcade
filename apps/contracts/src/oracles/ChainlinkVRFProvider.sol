// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IRandomnessProvider} from "../interfaces/IRandomnessProvider.sol";
import {IVRFV2PlusWrapper} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFV2PlusWrapper.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title ChainlinkVRFProvider
/// @notice Chainlink VRF v2.5 direct-funding implementation of IRandomnessProvider
/// @dev Users pay the wrapper request fee in native token when opening a blind box
contract ChainlinkVRFProvider is IRandomnessProvider, VRFV2PlusWrapperConsumerBase {
    /// @notice Error when request is not found
    error RequestNotFound();

    /// @notice Error when randomness not yet fulfilled
    error RandomnessNotFulfilled();

    /// @notice Error when caller provides less native token than the wrapper requires
    error InsufficientRequestFee(uint256 required, uint256 provided);

    /// @notice Error when refunding excess native token fails
    error RefundFailed();

    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256 randomness;
        address requester;
        uint256 paid;
    }

    uint32 public constant NUM_WORDS = 1;

    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;

    mapping(uint256 => RequestStatus) private _requests;
    mapping(bytes32 => uint256) private _internalToWrapper;

    constructor(
        address wrapper,
        uint32 callbackGasLimit_,
        uint16 requestConfirmations_
    )
        VRFV2PlusWrapperConsumerBase(wrapper)
    {
        callbackGasLimit = callbackGasLimit_;
        requestConfirmations = requestConfirmations_;
    }

    /// @notice Request randomness from Chainlink VRF wrapper using native payment
    /// @return requestId Internal request ID (bytes32)
    function requestRandomness() external payable returns (bytes32 requestId) {
        uint256 requestPrice = getRequestPrice();
        if (msg.value < requestPrice) {
            revert InsufficientRequestFee(requestPrice, msg.value);
        }

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        uint256 wrapperRequestId = i_vrfV2PlusWrapper.requestRandomWordsInNative{value: requestPrice}(
            callbackGasLimit, requestConfirmations, NUM_WORDS, extraArgs
        );

        requestId = bytes32(wrapperRequestId);
        _requests[wrapperRequestId] =
            RequestStatus({fulfilled: false, exists: true, randomness: 0, requester: msg.sender, paid: requestPrice});
        _internalToWrapper[requestId] = wrapperRequestId;

        if (msg.value > requestPrice) {
            (bool success,) = payable(msg.sender).call{value: msg.value - requestPrice}("");
            if (!success) {
                revert RefundFailed();
            }
        }

        emit RandomnessRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        RequestStatus storage request = _requests[requestId];
        if (!request.exists) {
            revert RequestNotFound();
        }

        request.fulfilled = true;
        request.randomness = randomWords[0];

        emit RandomnessFulfilled(bytes32(requestId), randomWords[0]);
    }

    function isFulfilled(bytes32 requestId) external view returns (bool fulfilled) {
        uint256 wrapperRequestId = _internalToWrapper[requestId];
        RequestStatus storage request = _requests[wrapperRequestId];

        if (!request.exists) {
            return false;
        }

        return request.fulfilled;
    }

    function getRandomness(bytes32 requestId) external view returns (uint256 randomness) {
        uint256 wrapperRequestId = _internalToWrapper[requestId];
        RequestStatus storage request = _requests[wrapperRequestId];

        if (!request.exists) {
            revert RequestNotFound();
        }
        if (!request.fulfilled) {
            revert RandomnessNotFulfilled();
        }

        return request.randomness;
    }

    function getRequestPrice() public view returns (uint256 price) {
        return i_vrfV2PlusWrapper.calculateRequestPriceNative(callbackGasLimit, NUM_WORDS);
    }

    function estimateRequestPrice(uint256 gasPriceWei) external view returns (uint256 price) {
        return i_vrfV2PlusWrapper.estimateRequestPriceNative(callbackGasLimit, NUM_WORDS, gasPriceWei);
    }

    function getRequestStatus(bytes32 requestId)
        external
        view
        returns (bool exists, bool fulfilled, uint256 randomness, address requester, uint256 paid)
    {
        uint256 wrapperRequestId = _internalToWrapper[requestId];
        RequestStatus storage request = _requests[wrapperRequestId];
        return (request.exists, request.fulfilled, request.randomness, request.requester, request.paid);
    }
}
