// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IJunkyardNFT} from "../interfaces/IJunkyardNFT.sol";

/// @title JunkyardNFT
/// @notice Series-specific ERC721 NFT collection for blind boxes
/// @dev This contract implements:
///      - Initializable pattern for minimal proxy deployment
///      - Soulbound NFTs (non-transferable except burn)
///      - Only the bound series contract can mint/burn
/// @author Development Team
contract JunkyardNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, IJunkyardNFT {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Contract version for upgrade tracking
    string public constant VERSION = "1.0.0";

    /// @notice The series contract bound to this NFT collection
    address public seriesContract;

    /// @notice Next token ID to mint
    uint256 private _nextTokenId;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Disables initializers on the implementation contract
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       INITIALIZER                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the NFT collection for a series
    function initialize(
        string memory name_,
        string memory symbol_,
        address seriesContract_,
        address initialOwner
    )
        external
        initializer
    {
        __ERC721_init(name_, symbol_);
        __Ownable_init(initialOwner);

        seriesContract = seriesContract_;
        _nextTokenId = 1; // Start token IDs at 1
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MODIFIERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Restricts function access to series contract only
    modifier onlySeries() {
        if (msg.sender != seriesContract) {
            revert UnauthorizedCaller();
        }
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mint a new blind box NFT
    /// @dev Only callable by the bound series contract
    /// @param to Address to receive the blind box
    /// @return tokenId Token ID of the minted blind box
    function mint(address to) external onlySeries returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        unchecked {
            ++_nextTokenId;
        }

        _mint(to, tokenId);

        emit BlindBoxMinted(to, tokenId);
    }

    /// @notice Burn a blind box NFT (when opened)
    /// @dev Only callable by the bound series contract
    /// @param tokenId Token ID to burn
    function burn(uint256 tokenId) external onlySeries {
        _burn(tokenId);

        emit BlindBoxBurned(tokenId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get total supply of blind boxes
    /// @return supply Total number of blind boxes minted
    function totalSupply() external view returns (uint256 supply) {
        unchecked {
            return _nextTokenId - 1;
        }
    }

    /// @notice Get the owner of a token
    /// @dev Override required due to multiple inheritance
    function ownerOf(uint256 tokenId) public view override(ERC721Upgradeable, IJunkyardNFT) returns (address) {
        return super.ownerOf(tokenId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Override transfer to make NFTs non-transferable (soulbound)
    /// @dev Only allows minting and burning, no transfers between users
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) and burning (to == address(0))
        // Disallow transfers between users
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }

        return super._update(to, tokenId, auth);
    }
}
