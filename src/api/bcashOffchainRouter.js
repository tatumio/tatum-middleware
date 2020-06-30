const express = require('express');
const {cancelWithdrawal, storeWithdrawal, broadcast} = require('../service/coreService');

const router = express.Router();
const {TBCH, BCH} = require('../constants');
const bcashService = require('../service/bcashService');

const chain = process.env.MODE === 'MAINNET' ? BCH : TBCH;

router.post('/transfer', async ({headers, body}, res) => {
  const {
    mnemonic, keyPair, attr, ...withdrawal
  } = body;

  if (!withdrawal.fee) {
    withdrawal.fee = '0.00005';
  }

  if (keyPair && mnemonic) {
    res.send(400).json({
      error: 'Either keyPair or mnemonic must be present, not both.',
      code: 'transaction.mnemonic.keyPair.both',
    });
    return;
  }
  if (!keyPair && !mnemonic && !attr) {
    res.send(400).json({
      error: 'Either keyPair and attr or mnemonic must be present.',
      code: 'transaction.mnemonic.keyPair.missing',
    });
    return;
  }
  if (!mnemonic && (!keyPair || !attr)) {
    res.send(400).json({error: 'Keypair and attr must be present.', code: 'transaction.attr.keyPair.missing'});
    return;
  }

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }
  const {id, data} = resp.data;

  const {
    amount, address,
  } = withdrawal;

  let txData;
  try {
    txData = bcashService.prepareTransaction(data, address, chain, amount, mnemonic, keyPair, attr);
  } catch (e) {
    console.error(e);
    try {
      await cancelWithdrawal(id, res, headers);
    } catch (_) {
    }
  }

  let r;
  try {
    await broadcast({
      txData,
      withdrawalId: id,
      currency: BCH,
    }, id, res, headers);
    return;
  } catch (err) {
    r = err.response;
  }

  try {
    await cancelWithdrawal(id, res, headers);
    if (r) {
      res.status(r.status).json({
        data: r.data,
        error: r.error,
        code: r.code,
        id,
      });
    }
  } catch (_) {
  }
});

module.exports = router;
