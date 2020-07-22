const express = require('express');
const bitcoin = require('bitcoinjs-lib');
const BigNumber = require('bignumber.js');

const router = express.Router();
const {TBTC, BTC} = require('../constants');
const commonService = require('../service/commonService');
const {getTxByAddressBtc, getUTXOBtc, broadcastBtc} = require('../service/coreService');
const btcService = require('../service/btcService');

const chain = process.env.MODE === 'MAINNET' ? BTC : TBTC;

router.get('/wallet', (req, res) => {
  const mnemonic = commonService.generateMnemonic(req.query.mnemonic);
  const wallet = btcService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const key = btcService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const {fromUTXO, fromAddress, to} = body;
  if ((!fromAddress && !fromUTXO) || (fromUTXO && fromAddress)) {
    res.send(400).json({
      message: 'Either UTXO, or addresses must be present.',
      statusCode: 400,
      errorCode: 'bitcoin.transaction.invalid.body'
    });
    return;
  }
  const network = (chain === TBTC) ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  const tx = new bitcoin.TransactionBuilder(network);
  const privateKeysToSign = [];
  if (fromAddress) {
    for (const item of fromAddress) {
      const txs = await getTxByAddressBtc(item.address, headers);
      for (const t of txs) {
        if (t.confirmations < 6) {
          continue;
        }
        for (const [i, o] of t.outputs.entries()) {
          if (o.address !== item.address) {
            continue;
          }
          try {
            await getUTXOBtc(t.hash, i, headers);
            tx.addInput(t.hash, i);
            privateKeysToSign.push(item.privateKey);
          } catch (e) {
          }
        }
      }
    }
  } else if (fromUTXO) {
    for (const item of fromUTXO) {
      tx.addInput(item.txHash, item.index);
      privateKeysToSign.push(item.privateKey);
    }
  }
  for (const item of to) {
    tx.addOutput(item.address, Number(new BigNumber(item.value).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
  }

  for (let i = 0; i < privateKeysToSign.length; i++) {
    const ecPair = bitcoin.ECPair.fromWIF(privateKeysToSign[i], network);
    tx.sign(i, ecPair);
  }
  let txData;
  try {
    txData = tx.build().toHex();
  } catch (e) {
    res.status(400).json({
      message: 'No spendable inputs.',
      statusCode: 400,
      errorCode: 'bitcoin.transaction.invalid.body'
    });
    return;
  }
  await broadcastBtc({txData}, res, headers);
});

module.exports = router;
