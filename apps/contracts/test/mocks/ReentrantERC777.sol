// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/interfaces/IJunkyardPrizePool.sol";
import "../../src/interfaces/IJunkyardSeries.sol";

contract ReentrantERC777 is ERC20 {
    address public targetPool;
    address public targetSeries;
    bool private attacking;

    constructor(address _pool, address _series) ERC20("Reentrant Token", "REENT") {
        targetPool = _pool;
        targetSeries = _series;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);

        // Attempt reentrancy during transfer
        if (!attacking && from == targetPool && to != address(0)) {
            attacking = true;
            try IJunkyardPrizePool(targetPool).distributePrize(to, block.timestamp) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
            attacking = false;
        }
    }
}
