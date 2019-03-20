'use strict';
const express = require('express')
const bitcoinTransaction = require('bitcoin-transaction')

const router = express.Router()

const {BTC} = require('../constants')
const commonService = require('../service/commonService')
const btcService = require('../service/btcService')

/**
 * Generate wallet.
 * @route POST /btc/wallet
 * @group BTC - Operations with Bitcoin blockchain
 * @param {WalletGenerate.model} chain.body.required - chain - BTC for Mainnet or TBTC for Testnet3
 * @returns {Wallet.model} 200 - Object containing mnemonic, xpriv and xpub for generated wallet.
 */
router.post('/wallet', (req, res) => {
  const {chain} = req.body

  const mnemonic = commonService.generateMnemonic()
  const wallet = btcService.generateWallet(chain, mnemonic)
  res.json({mnemonic, ...wallet})
})

/**
 * Calculate address from xpub on Testnet / Mainnet for given derivation index
 * @route GET /btc/wallet/xpub/{chain}/{xpub}/{i}
 * @group BTC - Operations with Bitcoin blockchain
 * @param {string} chain.path.required - chain - BTC for Mainnet or TBTC for Testnet3
 * @param {string} xpub.path.required - xpub to generate address from
 * @param {integer} i.path.required - derivation index of address
 * @returns {string} 200 - Generated address
 */
router.get('/wallet/xpub/:chain/:xpub/:i', ({params}, res) => {
  const {i, xpub, chain} = params
  const index = parseInt(i)

  const address = btcService.calculateAddress(xpub, chain, index)
  res.send(address)
})

/**
 * @typedef XPrivBtc
 * @property {string} chain.required - chain - BTC for Mainnet or TBTC for Testnet3
 * @property {string} mnemonic.required - mnemonic to generate private key from
 * @property {integer} index.required - derivation index of private key
 */

/**
 * Calculate private key of address from mnemonic on Testnet / Mainnet for given derivation index
 * @route POST /btc/wallet/xpriv
 * @group BTC - Operations with Bitcoin blockchain
 * @param {XPrivBtc.model} xpriv.body.required
 * @returns {string} 200 - Generated private key
 */
router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic, chain} = body
  const i = parseInt(index)

  const privateKeyWIF = btcService.calculatePrivateKey(chain, mnemonic, i)
  res.json(privateKeyWIF)
})

/**
 * @typedef BtcTransfer
 * @property {string} chain.required - chain - BTC for Mainnet or TBTC for Testnet3
 * @property {string} fromPriv.required - private key of address to send funds from
 * @property {string} from.required - address to send funds from
 * @property {string} to.required - address to send funds to
 * @property {number} amount.required - amount to send
 */

/**
 * Send BTC / TBTC from address to address
 * @route POST /btc/transfer
 * @group BTC - Operations with Bitcoin blockchain
 * @param {BtcTransfer.model} transfer.body.required
 * @returns {object} 200 - txHash of successful transaction
 */
router.post('/transfer', ({body}, res) => {
  const {fromPriv, from, to, amount, chain} = body

  bitcoinTransaction.sendTransaction({
    from,
    to,
    privKeyWIF: fromPriv,
    btc: amount,
    network: chain === BTC ? 'mainnet' : 'testnet'
  })
    .then(({text}) => {
      res.json({txHash: JSON.parse(text).tx.hash})
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error)
    })
})

module.exports = router
