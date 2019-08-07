const express = require('express');
const {cancelWithdrawal, storeWithdrawal, broadcast} = require('../service/coreService');

const router = express.Router();
const {TBTC, BTC} = require('../constants');
const commonService = require('../service/commonService');
const btcService = require('../service/btcService');

const chain = process.env.API_URL.endsWith('main') ? BTC : TBTC;

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = btcService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/wallet/xpub/:xpub/:i', ({params}, res) => {
  const {i, xpub} = params;
  const index = parseInt(i);

  const address = btcService.calculateAddress(xpub, chain, index);
  res.send({address});
});

router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const privateKeyWIF = btcService.calculatePrivateKey(chain, mnemonic, i);
  res.json(privateKeyWIF);
});

router.post('/transfer', async ({headers, body}, res) => {
  const {mnemonic, ...withdrawal} = body;

  if (!withdrawal.fee) {
    withdrawal.fee = 0.0005;
  }
  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }
  const {id, data} = resp.data;

  const {
    amount, fee, address,
  } = withdrawal;

  let txData;
  try {
    txData = btcService.prepareTransaction(data, address, chain, amount, fee, mnemonic);
  } catch (e) {
    console.error(e);
    try {
      await cancelWithdrawal(id, res, headers);
    } catch (_) {
    }
  }

  try {
    await broadcast({
      txData,
      withdrawalId: id,
      currency: BTC,
    }, id, res, headers);
    return;
  } catch (_) {
  }

  try {
    await cancelWithdrawal(id, res, headers);
  } catch (_) {
  }
});

module.exports = router;
