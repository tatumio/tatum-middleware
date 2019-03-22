'use strict';
const express = require('express')
const Web3 = require('web3')

const router = express.Router()
const tokenABI = require('../contracts/token_abi')
const tokenByteCode = require('../contracts/token_bytecode')
const commonService = require('../service/commonService')
const ethService = require('../service/ethService')

const {INFURA_KEY} = require('../constants')

/**
 * @typedef Wallet
 * @property {string} mnemonic - generated mnemonic for wallet
 * @property {string} xpriv - generated xpriv for wallet with derivation path according to BIP44
 * @property {string} xpub - generated xpub for wallet with derivation path according to BIP44
 */

/**
 * @typedef WalletGenerate
 * @property {string} chain - chain - 'mainnet' or 'ropsten'
 */

/**
 * @typedef Erc20
 * @property {string} tx - tx hash
 * @property {string} contractAddress - address of generated smart contract
 */

/**
 * @typedef XPrivEth
 *  @property {string} chain.required - chain - 'mainnet' or 'ropsten'
 * @property {string} mnemonic.required - mnemonic to generate private key from
 * @property {integer} index.required - derivation index of private key
 */

/**
 * @typedef EthTransfer
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten'
 * @property {string} fromPriv.required - private key of address to send funds from
 * @property {string} to.required - address to send funds to
 * @property {number} amount.required - amount to send
 */

/**
 * @typedef Erc20Transfer
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten'
 * @property {string} fromPriv.required - private key of address to send ERC20 from
 * @property {string} to.required - address to send ERC20 token
 * @property {number} amount.required - amount of ERC20 to send
 * @property {string} tokenAddress.required - address of ERC20 token
 */

/**
 * @typedef Erc20Deploy
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten'
 * @property {string} fromPriv.required - private key of address to deploy smart contract from
 * @property {string} data.required - smart contract byte code
 * @property {number} gasLimit.required - gas limit
 * @property {string} gasPrice.required - gas price
 */

/**
 * Generate wallet.
 * @route POST /eth/wallet
 * @group ETH - Operations with Ethereum blockchain
 * @param {WalletGenerate.model} chain.body.required - chain - 'mainnet' or 'ropsten'
 * @returns {Wallet.model} 200 - Object containing mnemonic, xpriv and xpub for generated wallet.
 */
router.post('/wallet', (req, res) => {
  const {chain} = req.body

  const mnemonic = commonService.generateMnemonic()
  const wallet = ethService.generateWallet(chain, mnemonic)
  res.json({mnemonic, ...wallet})
})

/**
 * Calculate address from xpub on Ropsten / Mainnet for given derivation index
 * @route GET /eth/wallet/xpub/{pub}/{i}
 * @group ETH - Operations with Ethereum blockchain
 * @param {string} pub.path.required - xpub to generate address from
 * @param {integer} i.path.required - derivation index of address
 * @returns {string} 200 - Generated address
 */
router.get('/wallet/xpub/:pub/:i', ({params}, res) => {
  const {i, pub} = params
  const address = ethService.calculateAddress(pub, i)
  res.send(address)
})

/**
 * Calculate private key of address from mnemonic on Ropsten / Mainnet for given derivation index
 * @route POST /eth/wallet/xpriv
 * @group ETH - Operations with Ethereum blockchain
 * @param {XPrivEth.model} xpriv.body.required
 * @returns {string} 200 - Generated private key
 */
router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic, chain} = body
  const i = parseInt(index)
  const privateKey = ethService.calculatePrivateKey(chain, mnemonic, i)
  res.json(privateKey)
})

/**
 * Send ETH / Ropsten ETH from account to account
 * @route POST /eth/transfer
 * @group ETH - Operations with Ethereum blockchain
 * @param {EthTransfer.model} transfer.body.required
 * @returns {object} 200 - txHash of successful transaction
 */
router.post('/transfer', ({body}, res) => {
  const {fromPriv, to, amount, chain} = body

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address

  const tx = {
    from: 0,
    to,
    value: amount,
    gasPrice: web3.utils.toWei('1', 'wei')
  }

  web3.eth.estimateGas(tx)
    .then(gasLimit => {
      tx.gasLimit = gasLimit
      web3.eth.sendTransaction(tx)
        .then((receipt) => {
          console.log(receipt)
          if (receipt.status) {
            res.json({txHash: receipt.transactionHash})
          } else {
            res.status(500).send(receipt)
          }
        })
        .catch((error) => {
          console.log(error)
          res.status(500).send(error.toString())
        })
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.toString())
    })
})

/**
 * Deploy ETH / Ropsten ETH ERC20 Smart Contract. Response could take quite a lot of time, average time of creation is 3-4 minutes.
 * @route POST /eth/erc20/deploy
 * @group ETH - Operations with Ethereum blockchain
 * @param {Erc20Deploy.model} erc20deploy.body.required
 * @returns {Erc20.model} 200
 */
router.post('/erc20/deploy', ({body}, res) => {
  const {fromPriv, gasLimit, gasPrice, data, chain} = body

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address

  const tx = {
    from: 0,
    data,
    gasLimit,
    gasPrice
  }
  web3.eth.sendTransaction(tx)
    .then((receipt) => {
      console.log(receipt)
      if (receipt.status) {
        const response = {}
        response.tx = receipt.transactionHash
        response.contractAddress = receipt.contractAddress
        res.json(response)
      } else {
        res.status(500).send(receipt)
      }
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.toString())
    })
})

/**
 * Transfer ETH / Ropsten ETH ERC20 Smart Contract Tokens from account to account
 * @route POST /eth/erc20/transfer
 * @group ETH - Operations with Ethereum blockchain
 * @param {Erc20Transfer.model} erc20.body.required
 * @returns {object} 200 - tx hash
 */
router.post('/erc20/transfer', async ({body}, res) => {
  const {tokenAddress, fromPriv, to, amount, chain} = body

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address
  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode
  })

  //TODO: nonce for outgoing transactions....
  const tx = {
    from: 0,
    to: tokenAddress,
    data: contract.methods.transfer(to, amount + '000000000000000000').encodeABI(),
    gasPrice: web3.utils.toWei('1', 'wei')
  }

  web3.eth.estimateGas(tx)
    .then(gasLimit => {
      tx.gasLimit = gasLimit
      web3.eth.sendTransaction(tx)
        .then((receipt) => {
          console.log(receipt)
          if (receipt.status) {
            res.json({txHash: receipt.transactionHash})
          } else {
            res.status(500).send(receipt)
          }
        })
        .catch((error) => {
          console.log(error)
          res.status(500).send(error.toString())
        })
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.toString())
    })
})

module.exports = router
