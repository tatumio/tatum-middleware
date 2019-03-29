'use strict';
const express = require('express')
const axios = require('axios')

const router = express.Router()

const {axios: axiosCoreInstance} = require('../index')

const {BTC} = require('../constants')
const commonService = require('../service/commonService')
const btcService = require('../service/btcService')

/**
 * @typedef WalletGenerateBtc
 * @property {string} chain - chain - eg: BTC
 */

/**
 * @typedef Address
 * @property {string} address - Generated address - eg: mtQygZAEbmgBCPJNMYRjGxa4C3kgTNdmXM
 */

/**
 * @typedef PrivKey
 * @property {string} key - Generated private key - eg: cTmS2jBWXgFaXZ2xG9jhn67TiyTshnMp3UedamzEhGm6BZV1vLgQ
 */

/**
 * @typedef TxHash
 * @property {string} txHash - txHash of successful transaction - eg: c83f8818db43d9ba4accfe454aa44fc33123d47a4f89d47b314d6748eb0e9bc9
 */

/**
 * Generate wallet.
 * @route POST /btc/wallet
 * @group BTC - Operations with Bitcoin blockchain
 * @param {WalletGenerateBtc.model} chain.body.required - chain - BTC for Mainnet or TBTC for Testnet3
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
 * @param {enum} chain.path.required - chain - BTC for Mainnet or TBTC for Testnet3 - eg: BTC,TBTC
 * @param {string} xpub.path.required - xpub to generate address from
 * @param {integer} i.path.required - derivation index of address
 * @returns {Address.model} 200 - Generated address
 */
router.get('/wallet/xpub/:chain/:xpub/:i', ({params}, res) => {
  const {i, xpub, chain} = params
  const index = parseInt(i)

  const address = btcService.calculateAddress(xpub, chain, index)
  res.send({address})
})

/**
 * @typedef XPrivBtc
 * @property {string} chain.required - chain - BTC for Mainnet or TBTC for Testnet3 - eg: BTC
 * @property {string} mnemonic.required - mnemonic to generate private key from - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 * @property {integer} index.required - derivation index of private key -eg: 4
 */

/**
 * Calculate private key of address from mnemonic on Testnet / Mainnet for given derivation index
 * @route POST /btc/wallet/xpriv
 * @group BTC - Operations with Bitcoin blockchain
 * @param {XPrivBtc.model} xpriv.body.required
 * @returns {PrivKey.model} 200 - Generated private key
 */
router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic, chain} = body
  const i = parseInt(index)

  const privateKeyWIF = btcService.calculatePrivateKey(chain, mnemonic, i)
  res.json(privateKeyWIF)
})

/**
 * @typedef WithdrawalBtc
 * @property {string} senderAccountId.required - Sender account ID - eg: 7c21ed165e294db78b95f0f181086d6f
 * @property {string} targetAddress.required - Blockchain address to send assets - eg: mpTwPdF8up9kidgcAStriUPwRdnE9MRAg7
 * @property {string} currency.required - Withdrawal currency - eg: TBTC
 * @property {number} amount.required - Amount to be sent in btc - eg: 0.02
 * @property {string} senderNote - Note visible to owner of withdrawing account - eg: Sender note
 * @property {boolean} force - Force withdrawal, even if it is non-compliant - eg: false
 * @property {string} mnemonic.required - private key of address to send funds from - eg: urge pulp usage sister evidence arrest palm math please chief egg abuse
 */

//TODO: returns error codes
/**
 * Send BTC / TBTC from address to address
 * @route POST /btc/withdrawal
 * @group BTC - Operations with Bitcoin blockchain
 * @param {WithdrawalBtc.model} transfer.body.required
 * @returns {TxHash.model} 200 - txHash of successful transaction - eg: {txHash: "c83f8818db43d9ba4accfe454aa44fc33123d47a4f89d47b314d6748eb0e9bc9"}
 * @security apiKey
 */
router.post('/withdrawal', async ({headers, body}, res) => {
  const {mnemonic, ...withdrawal} = body

  if (!withdrawal.fee) {
    withdrawal.fee = 0.0005
  }
  let resp
  try {
    resp = await axiosCoreInstance({
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
  const {id, vin, vinIndex, addresses, amounts} = resp.data
  const {currency, amount, fee, targetAddress} = withdrawal

  const rawtx = btcService.prepareTransaction(vin, vinIndex, addresses, amounts, targetAddress, currency, amount, fee, mnemonic)
  console.log('tx raw hex:', rawtx)

  try {
    const url = `${currency === BTC ? 'https://' : 'https://testnet.'}blockexplorer.com/api/tx/send`
    const {data} = await axios.post(url, {rawtx})

    const txId = data.txid
    axiosCoreInstance({
      method: 'PUT',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        'accept': headers['accept'] || 'application/json',
        'x-client-secret': headers['x-client-secret']
      },
      url: `api/v1/withdrawal/${id}/${txId}`,
      data: withdrawal
    }).then(() => res.json({txId}))
      .catch(({response}) => {
        console.error(response.data)
        res.status(response.status).json({
          ...response.data,
          txId,
          id,
          error: 'Withdrawal submitted to blockchain but not completed, wait until it is completed automatically in next block or complete it manually.',
          code: 'withdrawal.not.completed'
        })
      })
  } catch (e) {
    console.error(e)
    axiosCoreInstance({
      method: 'DELETE',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        'accept': headers['accept'] || 'application/json',
        'x-client-secret': headers['x-client-secret']
      },
      url: `api/v1/withdrawal/${id}`
    }).then(() => res.status(500).json({
      error: 'Unable to broadcast transaction, withdrawal cancelled.',
      code: 'withdrawal.hex.cancelled'
    }))
      .catch(({response}) => res.status(response.status).json({
        ...response.data,
        error: 'Unable to broadcast transaction, and impossible to cancel withdrawal. ID is attached, cancel it manually.',
        code: 'withdrawal.hex.not.cancelled',
        id
      }))
  }
})

module.exports = router
