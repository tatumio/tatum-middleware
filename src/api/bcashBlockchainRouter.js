const express = require('express');
const {BITBOX, REST_URL, TREST_URL} = require('bitbox-sdk');
const BigNumber = require('bignumber.js');

const router = express.Router();
const {TBCH, BCH} = require('../constants');
const commonService = require('../service/commonService');
const {getUTXOBch, broadcastBch} = require('../service/coreService');
const bchService = require('../service/bcashService');

const chain = process.env.MODE === 'MAINNET' ? BCH : TBCH;

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = bchService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const key = bchService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const network = (chain === TBCH) ? 'testnet' : 'mainnet';
  const bitbox = new BITBOX({restURL: chain === TBCH ? TREST_URL : REST_URL});
  const {fromUTXO, fromAddress, to} = body;
  if ((!fromAddress && !fromUTXO) || (fromUTXO && fromAddress)) {
    res.send(400).json({error: 'Either UTXO, or addresses must be present.', code: 'bitcoin.transaction.invalid.body'});
    return;
  }

  const transactionBuilder = new bitbox.TransactionBuilder(network);
  const privateKeysToSign = [];
  const amountToSign = [];
  if (fromAddress) {
    for (const item of fromAddress) {
      const utxo = await getUTXOBch(item.address, headers);
      for (const u of utxo.utxos) {
        if (u.confirmations < 6) {
          continue;
        }
        transactionBuilder.addInput(u.txid, u.vout);
        privateKeysToSign.push(item.privateKey);
        amountToSign.push(u.satoshis);
      }
    }
  } else if (fromUTXO) {
    const txs = await bitbox.Transaction.details(fromUTXO.map(u => u.txHash));
    for (const [i, item] of fromUTXO.entries()) {
      transactionBuilder.addInput(item.txHash, item.index);
      privateKeysToSign.push(item.privateKey);
      amountToSign.push(Number(new BigNumber(txs[i].vout[item.index].value).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
    }
  }
  for (const item of to) {
    transactionBuilder.addOutput(item.address, Number(new BigNumber(item.value).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
  }

  for (let i = 0; i < privateKeysToSign.length; i++) {
    const ecPair = bitbox.ECPair.fromWIF(privateKeysToSign[i]);
    transactionBuilder.sign(i, ecPair, undefined, transactionBuilder.hashTypes.SIGHASH_ALL, amountToSign[i], transactionBuilder.signatureAlgorithms.SCHNORR);
  }
  let txData;
  try {
    txData = transactionBuilder.build().toHex();
  } catch (e) {
    console.log(e);
    res.status(400).json({error: e.message, code: 'bcash.transaction.invalid.body'});
    return;
  }
  await broadcastBch({txData}, res, headers);
});

module.exports = router;
