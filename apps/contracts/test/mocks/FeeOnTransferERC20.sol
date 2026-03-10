// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FeeOnTransferERC20 is ERC20 {
    uint256 public immutable feeBps;
    address public immutable feeCollector;

    constructor(string memory name, string memory symbol, uint256 feeBps_, address feeCollector_) ERC20(name, symbol) {
        feeBps = feeBps_;
        feeCollector = feeCollector_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from == address(0) || to == address(0) || feeBps == 0) {
            super._update(from, to, amount);
            return;
        }

        uint256 fee = (amount * feeBps) / 10_000;
        uint256 netAmount = amount - fee;

        super._update(from, feeCollector, fee);
        super._update(from, to, netAmount);
    }
}
