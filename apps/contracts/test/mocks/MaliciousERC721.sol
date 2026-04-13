// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MaliciousERC721 is ERC721 {
    bool public shouldRevert;

    constructor() ERC721("Malicious NFT", "MNFT") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function setShouldRevert(bool _shouldRevert) public {
        shouldRevert = _shouldRevert;
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        if (shouldRevert) {
            revert("Malicious revert");
        }
        return super.ownerOf(tokenId);
    }
}
