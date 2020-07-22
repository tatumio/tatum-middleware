const express = require('express');
const bitcoin = require('bitcoinjs-lib');
const BigNumber = require('bignumber.js');

const router = express.Router();
const {
  TLTC, LTC, LTC_NETWORK_MAINNET, LTC_NETWORK_TESTNET,
} = require('../constants');
const commonService = require('../service/commonService');
const {getTxByAddressLtc, getUTXOLtc, broadcastLtc} = require('../service/coreService');
const ltcService = require('../service/ltcService');

const chain = process.env.MODE === 'MAINNET' ? LTC : TLTC;

router.get('/wallet', (req, res) => {
  const mnemonic = commonService.generateMnemonic(req.query.mnemonic);
  const wallet = ltcService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const key = ltcService.calculatePrivateKey(chain, mnemonic, i);
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
  const network = (chain === TLTC) ? LTC_NETWORK_TESTNET : LTC_NETWORK_MAINNET;
  const tx = new bitcoin.TransactionBuilder(network);
  const privateKeysToSign = [];
  if (fromAddress) {
    for (const item of fromAddress) {
      const txs = await getTxByAddressLtc(item.address, headers);
      for (const t of txs) {
        if (t.confirmations < 6) {
          continue;
        }
        for (const [i, o] of t.outputs.entries()) {
          if (o.address !== item.address) {
            continue;
          }
          try {
            await getUTXOLtc(t.hash, i, headers);
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
  await broadcastLtc({txData}, res, headers);
});

module.exports = router;
