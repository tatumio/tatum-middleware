const express = require('express');
const {Transaction} = require('bsv');
const BigNumber = require('bignumber.js');

const router = express.Router();
const {TBSV, BSV} = require('../constants');
const commonService = require('../service/commonService');
const {getBsvTx, broadcastBsv} = require('../service/coreService');
const bsvService = require('../service/bsvService');

const chain = process.env.MODE === 'MAINNET' ? BSV : TBSV;

router.get('/wallet', (req, res) => {
  const mnemonic = commonService.generateMnemonic(req.query.mnemonic);
  const wallet = bsvService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/address/:xpub/:i', ({params}, res) => {
  const {i, xpub} = params;
  const index = parseInt(i);

  const address = bsvService.calculateAddress(xpub, chain, index);
  res.send({address});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const key = bsvService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const {fromUTXO, changeAddress, to} = body;
  let tx = new Transaction();
  const privateKeysToSign = [];
  for (const item of fromUTXO) {
    const t = await getBsvTx(item.txHash, headers);
    tx = tx.from({
      txId: item.txHash,
      outputIndex: item.index,
      satoshis: Number(new BigNumber(t.vout[item.index].value).multipliedBy(100000000).toFixed(0, BigNumber.ROUND_FLOOR)),
      script: t.vout[item.index].scriptPubKey.hex,
    });
    privateKeysToSign.push(item.privateKey);
  }
  for (const item of to) {
    tx = tx.to(item.address, Number(new BigNumber(item.value).multipliedBy(100000000).toFixed(0, BigNumber.ROUND_FLOOR)));
  }

  tx = tx.change(changeAddress)
    .sign(privateKeysToSign);
  let txData;
  try {
    txData = tx.serialize();
  } catch (e) {
    console.error(e);
    res.status(400).json({error: 'No spendable inputs.', code: 'bitcoin.transaction.invalid.body'});
    return;
  }
  await broadcastBsv({txData}, res, headers);
});

module.exports = router;
