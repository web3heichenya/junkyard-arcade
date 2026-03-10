// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IJunkyardNFT
/// @notice Interface for series-specific blind box NFT collection
/// @dev Each series has its own dedicated NFT collection
interface IJunkyardNFT {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Error thrown when caller is not the bound series contract
    error UnauthorizedCaller();

    /// @notice Error thrown when attempting to transfer a blind box
    error TransferNotAllowed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a new blind box is minted
    /// @param to Address receiving the blind box
    /// @param tokenId Token ID of the minted blind box
    event BlindBoxMinted(address indexed to, uint256 indexed tokenId);

    /// @notice Emitted when a blind box is burned (opened)
    /// @param tokenId Token ID of the burned blind box
    event BlindBoxBurned(uint256 indexed tokenId);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       INITIALIZER                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the NFT collection for a series
    /// @param name_ Collection name
    /// @param symbol_ Collection symbol
    /// @param seriesContract_ Address of the series contract
    /// @param initialOwner Address of the initial owner
    function initialize(
        string memory name_,
        string memory symbol_,
        address seriesContract_,
        address initialOwner
    )
        external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  PUBLIC UPDATE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mint a new blind box NFT
    /// @dev Only callable by the bound series contract
    /// @param to Address to receive the blind box
    /// @return tokenId Token ID of the minted blind box
    function mint(address to) external returns (uint256 tokenId);

    /// @notice Burn a blind box NFT (when opened)
    /// @dev Only callable by the bound series contract
    /// @param tokenId Token ID to burn
    function burn(uint256 tokenId) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   PUBLIC READ FUNCTIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the series contract bound to this NFT collection
    /// @return Address of the series contract
    function seriesContract() external view returns (address);

    /// @notice Get total supply of blind boxes
    /// @return supply Total number of blind boxes minted
    function totalSupply() external view returns (uint256 supply);

    /// @notice Get the owner of a blind box
    /// @dev Inherited from ERC721 but declared here for interface completeness
    /// @param tokenId Token ID to query
    /// @return owner Address of the token owner
    function ownerOf(uint256 tokenId) external view returns (address owner);
}
