pragma solidity ^0.5.0;

import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol";
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/access/roles/MinterRole.sol";


/**
 * @title Full ERC721 Token
 * @dev This implementation includes all the required and some optional functionality of the ERC721 standard
 * Moreover, it includes approve all functionality using operator terminology.
 *
 * See https://eips.ethereum.org/EIPS/eip-721
 */
contract ERC721Full is ERC721, ERC721Enumerable, ERC721Metadata, MinterRole {
    constructor (string memory name, string memory symbol) public ERC721Enumerable() ERC721() ERC721Metadata(name, symbol) {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Function to mint tokens.
     * @param to The address that will receive the minted tokens.
     * @param tokenId The token id to mint.
     * @param tokenURI The token URI of the minted token.
     * @return A boolean that indicates if the operation was successful.
     */
    function mintWithTokenURI(address to, uint256 tokenId, string memory tokenURI) public onlyMinter returns (bool) {
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return true;
    }

    function mintMultipleWithoutTokenURI(address[] memory to, uint256[] memory tokenId) public onlyMinter returns (bool) {
      for (uint i=0; i < to.length; i++) {
        _mint(to[i], tokenId[i]);
      }
      return true;
    }

    function burn(uint256 tokenId) public {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721Burnable: caller is not owner nor approved");
        _burn(tokenId);
    }
}
