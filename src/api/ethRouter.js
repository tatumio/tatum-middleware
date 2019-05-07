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

router.post('/wallet', (req, res) => {
  const {chain} = req.body

  const mnemonic = commonService.generateMnemonic()
  const wallet = ethService.generateWallet(chain, mnemonic)
  res.json({mnemonic, ...wallet})
})

router.get('/wallet/xpub/:pub/:i', ({params}, res) => {
  const {i, pub} = params
  const address = ethService.calculateAddress(pub, i)
  res.send({address})
})

router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic, chain} = body
  const i = parseInt(index)
  const privateKey = ethService.calculatePrivateKey(chain, mnemonic, i)
  res.json({privateKey})
})

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
    to: targetAddress.trim(),
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
            'authorization': headers['authorization']
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
      if (!id) {
        res.sendStatus(200)
        return
      }

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
                data: response.data
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
        'authorization': headers['authorization']
      },
      url: `api/v1/erc20/${customerId}`,
      data: erc20
    })

    const {data, gasLimit, gasPrice, accountId} = response.data
    const tx = {
      from: 0,
      data,
      gasLimit,
      gasPrice
    }
    web3.eth.sendTransaction(tx)
      .then((receipt) => {
        if (receipt.status) {
          const result = {accountId}
          result.tx = receipt.transactionHash
          result.contractAddress = receipt.contractAddress

          axios({
            method: 'POST',
            headers: {
              'content-type': headers['content-type'] || 'application/json',
              'accept': headers['accept'] || 'application/json',
              'authorization': headers['authorization']
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
        console.error(error)
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

router.post('/erc20/transfer', async ({body, headers}, res) => {
  const {mnemonic, chain, index, tokenAddress, ...withdrawal} = body
  const {amount, targetAddress} = withdrawal

  const i = parseInt(index)
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i)
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`)
  web3.eth.accounts.wallet.add(fromPriv)
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address
  withdrawal.sourceAddress = web3.eth.accounts.wallet[0].address
  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode
  })

  const tx = {
    from: 0,
    to: tokenAddress.trim(),
    data: contract.methods.transfer(targetAddress.trim(), new BN(amount, 10).mul(new BN(10).pow(new BN(18))).toString(16)).encodeABI(),
    gasPrice: web3.utils.toWei('1', 'wei')
  }

  web3.eth.estimateGas(tx)
    .then(async gasLimit => {
      tx.gasLimit = gasLimit
      withdrawal.fee = web3.utils.fromWei(tx.gasLimit + '', 'ether')
      let resp
      try {
        resp = await axios({
          method: 'POST',
          headers: {
            'content-type': headers['content-type'] || 'application/json',
            'accept': headers['accept'] || 'application/json',
            'authorization': headers['authorization']
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

      if (!id) {
        res.sendStatus(200)
        return
      }
      web3.eth.sendTransaction(tx)
        .on('transactionHash', (txId) => {

          axios({
            method: 'PUT',
            headers: {
              'content-type': headers['content-type'] || 'application/json',
              'accept': headers['accept'] || 'application/json',
              'authorization': headers['authorization']
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
                data: response.data
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

module.exports = router
