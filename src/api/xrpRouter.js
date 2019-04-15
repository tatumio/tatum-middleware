'use strict'
const express = require('express')
const xrp = require('ripple-lib').RippleAPI

const offlineApi = new xrp()
const MAINNET = 'wss://s1.ripple.com'
const TESTNET = 'wss://s.altnet.rippletest.net:51233'
const router = express.Router()

const {axios} = require('../index')

const {XRP} = require('../constants')

router.post('/wallet', (req, res) => {
  const wallet = offlineApi.generateAddress()
  res.json(wallet)
})

router.post('/transfer', async ({headers, body}, res) => {
  const {chain, account, secret, destinationTag, ...withdrawal} = body

  const api = new xrp({server: chain === XRP ? MAINNET : TESTNET})
  api.on('error', (errorCode, errorMessage) => {
    console.log(errorCode + ': ' + errorMessage)
    res.status(500).json({
      error: 'Unable to connect to XRP server.',
      errorCode: 'withdrawal.connect',
      originalErrorCode: errorCode,
      originalErrorMessage: errorMessage
    })
  })

  api.connect().then(async () => {
    withdrawal.currency = chain
    try {
      withdrawal.fee = await api.getFee()
    } catch (e) {
      res.status(500).send({
        error: 'Unable to calculate fee.',
        code: 'withdrawal.fee'
      })
      return
    }

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
        data: {...withdrawal, attr: destinationTag}
      })
    } catch ({response}) {
      console.error(response.data)
      res.status(response.status).send(response.data)
      return
    }

    const {id} = resp.data
    const {amount, fee, targetAddress} = withdrawal

    const payment = {
      source: {
        address: account,
        amount: {
          currency: 'drops',
          value: (amount * 1000000) + ''
        }
      },
      destination: {
        address: targetAddress,
        minAmount: {
          currency: 'drops',
          value: (amount * 1000000) + ''
        },
        tag: destinationTag
      }
    }
    try {
      const {signedTransaction, id: txId} = await api.preparePayment(account, payment, {fee})
        .then(tx => api.sign(tx.txJSON, secret))
      const result = await api.submit(signedTransaction)
      if (result.engine_result_code === 0) {
        axios({
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
        return
      }
      throw result
    } catch (e) {
      console.error(e)
      axios({
        method: 'DELETE',
        headers: {
          'content-type': headers['content-type'] || 'application/json',
          'accept': headers['accept'] || 'application/json',
          'x-client-secret': headers['x-client-secret']
        },
        url: `api/v1/withdrawal/${id}`
      }).then(() => res.status(500).json({
        error: 'Unable to broadcast transaction, withdrawal cancelled.',
        originalError: e.engine_result_message,
        originalErrorCode: e.engine_result,
        code: 'withdrawal.hex.cancelled'
      }))
        .catch(({response}) => res.status(response.status).json({
          ...response.data,
          error: 'Unable to broadcast transaction, and impossible to cancel withdrawal. ID is attached, cancel it manually.',
          code: 'withdrawal.hex.not.cancelled',
          originalError: e.engine_result_message,
          originalErrorCode: e.engine_result,
          id
        }))
    }
  }).then(() => api.disconnect())
    .catch(e => {
      console.error(e)
      res.status(500).send({
        error: 'Unable to connect to blockchain.',
        code: 'withdrawal.connection',
      })
    })
})

module.exports = router
