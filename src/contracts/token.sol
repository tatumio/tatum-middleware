pragma solidity ^0.5.2;

import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Capped.sol";
import "github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

/**
 * @title Token
 */
contract Token is ERC20Detailed, ERC20Capped, ERC20Burnable {

  string public builtOn = "https://tatum.io";

  constructor(
    string memory name,
    string memory symbol,
    address receiver,
    uint8 decimals,
    uint256 cap,
    uint256 initialBalance
  )
  ERC20Detailed(name, symbol, decimals)
  ERC20Capped(cap)
  public
  {
    if (initialBalance > 0) {
      _mint(receiver, initialBalance);
    }
  }
}
