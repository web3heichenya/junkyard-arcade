// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ChainlinkVRFProvider} from "../../src/oracles/ChainlinkVRFProvider.sol";

contract MockVRFV2PlusWrapper {
    uint256 public lastRequestId;
    uint256 public requestPrice = 0.01 ether;

    function setRequestPrice(uint256 newPrice) external {
        requestPrice = newPrice;
    }

    function calculateRequestPriceNative(uint32, uint32) external view returns (uint256) {
        return requestPrice;
    }

    function estimateRequestPriceNative(uint32, uint32, uint256) external view returns (uint256) {
        return requestPrice;
    }

    function requestRandomWordsInNative(
        uint32,
        uint16,
        uint32,
        bytes calldata
    )
        external
        payable
        returns (uint256 requestId)
    {
        require(msg.value >= requestPrice, "fee too low");
        unchecked {
            ++lastRequestId;
        }
        return lastRequestId;
    }

    function fulfill(address consumer, uint256 requestId, uint256 randomness) external {
        uint256[] memory words = new uint256[](1);
        words[0] = randomness;
        ChainlinkVRFProvider(consumer).rawFulfillRandomWords(requestId, words);
    }

    function link() external pure returns (address) {
        return address(0);
    }

    function linkNativeFeed() external pure returns (address) {
        return address(0);
    }
}

contract ChainlinkVRFProviderTest is Test {
    MockVRFV2PlusWrapper public wrapper;
    ChainlinkVRFProvider public provider;

    function setUp() public {
        wrapper = new MockVRFV2PlusWrapper();
        provider = new ChainlinkVRFProvider(address(wrapper), 200_000, 3);
    }

    function testRequestRandomness_RevertWhenNativeValueIsTooLow() public {
        vm.expectRevert(abi.encodeWithSelector(ChainlinkVRFProvider.InsufficientRequestFee.selector, 0.01 ether, 1 wei));
        provider.requestRandomness{value: 1 wei}();
    }

    function testRequestRandomness_RefundsExcessAndTracksFulfillment() public {
        address caller = address(0xBEEF);
        vm.deal(caller, 1 ether);

        vm.prank(caller);
        uint256 balanceBefore = caller.balance;
        bytes32 requestId = provider.requestRandomness{value: 0.05 ether}();
        uint256 balanceAfter = caller.balance;

        assertEq(balanceBefore - balanceAfter, 0.01 ether);
        assertEq(provider.getRequestPrice(), 0.01 ether);
        assertEq(provider.estimateRequestPrice(123 gwei), 0.01 ether);
        assertFalse(provider.isFulfilled(requestId));

        wrapper.fulfill(address(provider), uint256(requestId), 123_456);

        assertTrue(provider.isFulfilled(requestId));
        assertEq(provider.getRandomness(requestId), 123_456);
    }
}
