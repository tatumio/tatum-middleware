'use strict';
const express = require('express')
const Web3 = require('web3')
const _ = require('lodash')
const BN = require('bn.js')

const router = express.Router()
const tokenABI = require('../contracts/token_abi')
const tokenByteCode = require('../contracts/token_bytecode')
const commonService = require('../service/commonService')
const ethService = require('../service/ethService')
const {axios} = require('../index')

const {INFURA_KEY, ETH} = require('../constants')

/**
 * @typedef Wallet
 * @property {string} mnemonic - generated mnemonic for wallet - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {string} xpriv - generated xpriv for wallet with derivation path according to BIP44 - eg: xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr
 * @property {string} xpub - generated xpub for wallet with derivation path according to BIP44 - eg: xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid
 */

/**
 * @typedef WalletGenerateEth
 * @property {string} chain - 'mainnet' or 'ropsten' - eg: ropsten
 */

/**
 * @typedef Erc20
 * @property {string} tx - tx hash - eg: 0x93feef50a0754d5b815964ec41a744b8b60fd83bac7657386b21cd8a7c38a3b1
 * @property {string} contractAddress - address of generated smart contract - eg: 0x687422eEA2cB73B5d3e242bA5456b782919AFc85
 */

/**
 * @typedef XPrivEth
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten' - eg: ropsten
 * @property {string} mnemonic.required - mnemonic to generate private key from - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {integer} index.required - derivation index of private key - eg: 0
 */

/**
 * @typedef EthTransfer
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten' - eg: ropsten
 * @property {string} mnemonic.required - mnemonic to generate private key of sender - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {integer} index.required - derivation index of sender address of sender - eg: 0
 * @property {string} senderAccountId.required - Sender account ID - eg: 7c21ed165e294db78b95f0f181086d6f
 * @property {string} targetAddress.required - Blockchain address to send assets - eg: 0x687422eEA2cB73B5d3e242bA5456b782919AFc85
 * @property {integer} amount.required - Amount to be sent in wei - eg: 100000
 * @property {string} senderNote - Note visible to owner of withdrawing account - eg: Sender note
 * @property {boolean} force - Force payment, even if it is non-compliant - eg: false
 */

/**
 * @typedef Erc20Transfer
 ** @property {string} chain.required - chain - 'mainnet' or 'ropsten' - eg: ropsten
 * @property {string} mnemonic.required - mnemonic to generate private key of sender - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {integer} index.required - derivation index of sender address of sender - eg: 0
 * @property {string} senderAccountId.required - Sender account ID - eg: 7c21ed165e294db78b95f0f181086d6f
 * @property {string} targetAddress.required - Blockchain address to send assets - eg: 0x687422eEA2cB73B5d3e242bA5456b782919AFc85
 * @property {string} currency.required - ERC20 symbol - eg: MY_SYMBOL
 * @property {integer} amount.required - Amount to be sent in wei - eg: 100000
 * @property {string} senderNote - Note visible to owner of withdrawing account - eg: Sender note
 * @property {boolean} force - Force payment, even if it is non-compliant - eg: false
 * @property {string} tokenAddress.required - address of ERC20 token - eg: 0x687422eEA2cB73B5d3e242bA5456b782919AFc85
 */

/**
 * @typedef Erc20Deploy
 * @property {string} chain.required - chain - 'mainnet' or 'ropsten' - eg: ropsten
 * @property {string} mnemonic.required - mnemonic to generate private key of deployer of ERC20 - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {integer} index.required - derivation index of deployer address of ERC20 - eg: 0
 * @property {integer} payIndex.required - derivation index of address to pay for deployment of ERC20 - eg: 0
 * @property {integer} customerId.required - ID of customer to create ERC20 for - eg: 5
 * @property {string} name.required - name of the ERC20 token - eg: My ERC20 Token
 * @property {string} symbol.required - symbol of the ERC20 token - eg: MT
 * @property {integer} supply.required - max supply of ERC20 token - eg: 10000000
 * @property {enum} basePair.required - Base pair for ERC20 token. 1 token will be equal to 1 unit of base pair. Transaction value will be calculated according to this base pair. - eg: BTC,ETH,USD,CZK,EUR
 */

/**
 * Generate wallet.
 * @route POST /eth/wallet
 * @group ETH - Operations with Ethereum blockchain
 * @param {WalletGenerateEth.model} chain.body.required - chain - 'mainnet' or 'ropsten'
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
 * @returns {Address.model} 200 - Generated address
 */
router.get('/wallet/xpub/:pub/:i', ({params}, res) => {
  const {i, pub} = params
  const address = ethService.calculateAddress(pub, i)
  res.send({address})
})

/**
 * Calculate private key of address from mnemonic on Ropsten / Mainnet for given derivation index
 * @route POST /eth/wallet/xpriv
 * @group ETH - Operations with Ethereum blockchain
 * @param {XPrivEth.model} xpriv.body.required
 * @returns {PrivKey.model} 200 - Generated private key
 */
router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic, chain} = body
  const i = parseInt(index)
  const privateKey = ethService.calculatePrivateKey(chain, mnemonic, i)
  res.json({privateKey})
})

/**
 * Send ETH / Ropsten ETH from account to account
 * @route POST /eth/transfer
 * @group ETH - Operations with Ethereum blockchain
 * @param {EthTransfer.model} transfer.body.required
 * @returns {TxHash.model} 200 - txHash of successful transaction
 * @security apiKey
 */
router.post('/transfer', ({body, headers}, res) => {
  const {mnemonic, chain, index, ...withdrawal} = body
  const {amount, targetAddress} = withdrawal

  const i = parseInt(index)
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i)
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address
  withdrawal.sourceAddress = web3.eth.accounts.wallet[0].address

  const tx = {
    from: 0,
    to: targetAddress,
    value: amount,
    gasPrice: web3.utils.toWei('1', 'wei')
  }

  web3.eth.estimateGas(tx)
    .then(async gasLimit => {
      tx.gasLimit = gasLimit
      withdrawal.amount = web3.utils.fromWei(amount + '', 'ether')
      withdrawal.fee = web3.utils.fromWei(gasLimit + '', 'ether')
      withdrawal.currency = chain === ETH ? 'ETH' : 'TETH'
      let resp
      try {
        resp = await axios({
          method: 'POST',
          headers: {
            'content-type': headers['content-type'] || 'application/json',
            'accept': headers['accept'] || 'application/json',
            'x-client-secret': headers['x-client-secret']
          },
          url: `api/v1/withdrawal`,
          data: withdrawal
        })
      } catch ({response}) {
        console.error(response.data)
        res.status(response.status).send(response.data)
        return
      }
      const {id} = resp.data

      web3.eth.sendTransaction(tx)
        .on('transactionHash', (txId) => {

          axios({
            method: 'PUT',
            headers: {
              'content-type': headers['content-type'] || 'application/json',
              'accept': headers['accept'] || 'application/json',
              'x-client-secret': headers['x-client-secret']
            },
            url: `api/v1/withdrawal/${id}/${txId}`,
            data: withdrawal
          })
            .then(() => res.json({txId}))
            .catch(({response}) => {
              console.error(response.data)
              res.status(response.status).json({
                txId,
                id,
                error: 'Withdrawal submitted to blockchain but not completed, wait until it is completed automatically in next block or complete it manually.',
                code: 'withdrawal.not.completed',
                ...response.data
              })
            })
        })
        .on('error', (error) => {
          console.log(error)
          res.status(500).send(error.toString())
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
 * @returns {Erc20.model} 200 - information about ERC20 smart contract
 * @security apiKey
 */
router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {mnemonic, payIndex, chain, customerId, ...erc20} = body
  const {symbol} = erc20

  const i = parseInt(payIndex)
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i)
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address

  erc20.chain = chain === ETH ? 'ETH' : 'TETH'
  erc20.xpub = ethService.generateWallet(chain, mnemonic).xpub

  try {
    const response = await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        'accept': headers['accept'] || 'application/json',
        'x-client-secret': headers['x-client-secret']
      },
      url: `api/v1/erc20/${customerId}`,
      data: erc20
    })

    console.log(response.data)
    const {data, gasLimit, gasPrice, accountId} = response.data
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
          const result = {accountId}
          result.tx = receipt.transactionHash
          result.contractAddress = receipt.contractAddress

          axios({
            method: 'POST',
            headers: {
              'content-type': headers['content-type'] || 'application/json',
              'accept': headers['accept'] || 'application/json',
              'x-client-secret': headers['x-client-secret']
            },
            url: `api/v1/erc20/${symbol}/${result.contractAddress}`,
          })
            .then(() => res.json(result))
            .catch(({resp}) => {
              console.error(resp.data)
              res.status(resp.status).json({
                ...response,
                ...resp.data,
                error: 'Unable to set contract address for ERC20 symbol to Tatum Core, manual update is necessary.',
                code: 'erc20.not.completed'
              })
            })
        } else {
          res.status(500).send(receipt)
        }
      })
      .catch((error) => {
        console.log(error)
        res.status(500).json({
          error: 'Unable to deploy ERC20 to blockchain.',
          code: 'erc20.not.deployed',
          reason: error.toString()
        })
      })
  } catch (e) {
    console.error(e.response.data)
    res.status(e.response.status).json(e.response.data)
  }
})

/**
 * Transfer ETH / Ropsten ETH ERC20 Smart Contract Tokens from account to account
 * @route POST /eth/erc20/transfer
 * @group ETH - Operations with Ethereum blockchain
 * @param {Erc20Transfer.model} erc20.body.required
 * @returns {TxHash.model} 200 - txHash of successful transaction
 * @security apiKey
 */
router.post('/erc20/transfer', async ({body, headers}, res) => {
  const {mnemonic, chain, index, tokenAddress, ...withdrawal} = body
  const {amount, targetAddress} = withdrawal

  const i = parseInt(index)
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i)
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address
  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode
  })

  const tx = {
    from: 0,
    to: tokenAddress,
    data: contract.methods.transfer(targetAddress, new BN(amount, 10).mul(new BN(10).pow(new BN(18))).toString(16)).encodeABI(),
    gasPrice: web3.utils.toWei('1', 'wei'),
  }

  tx.gasLimit = 200000
  withdrawal.fee = web3.utils.fromWei(tx.gasLimit + '', 'ether')
  let resp
  try {
    resp = await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        'accept': headers['accept'] || 'application/json',
        'x-client-secret': headers['x-client-secret']
      },
      url: `api/v1/withdrawal`,
      data: withdrawal
    })
  } catch ({response}) {
    console.error(response.data)
    res.status(response.status).send(response.data)
    return
  }
  const {id} = resp.data

  web3.eth.sendTransaction(tx)
    .on('transactionHash', (txId) => {

      axios({
        method: 'PUT',
        headers: {
          'content-type': headers['content-type'] || 'application/json',
          'accept': headers['accept'] || 'application/json',
          'x-client-secret': headers['x-client-secret']
        },
        url: `api/v1/withdrawal/${id}/${txId}`,
        data: withdrawal
      })
        .then(() => res.json({txId}))
        .catch(({response}) => {
          console.error(response.data)
          res.status(response.status).json({
            txId,
            id,
            error: 'Withdrawal submitted to blockchain but not completed, wait until it is completed automatically in next block or complete it manually.',
            code: 'withdrawal.not.completed',
            ...response.data
          })
        })
    })
    .on('error', (error) => {
      console.log(error)
      res.status(500).send(error.toString())
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.toString())
    })
})

module.exports = router
