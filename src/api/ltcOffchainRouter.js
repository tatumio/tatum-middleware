const express = require('express');
const {cancelWithdrawal, storeWithdrawal, broadcast} = require('../service/coreService');

const router = express.Router();
const {TLTC, LTC} = require('../constants');
const ltcService = require('../service/ltcService');

const chain = process.env.MODE === 'MAINNET' ? LTC : TLTC;

router.post('/transfer', async ({headers, body}, res) => {
  const {
    mnemonic, keyPair, attr, ...withdrawal
  } = body;

  if (!withdrawal.fee) {
    withdrawal.fee = '0.0005';
  }

  if (keyPair && mnemonic) {
    res.send(400).json({
      message: 'Either keyPair or mnemonic must be present, not both.',
      statusCode: 400,
      errorCode: 'transaction.mnemonic.keyPair.both',
    });
    return;
  }
  if (!keyPair && !mnemonic && !attr) {
    res.send(400).json({
      message: 'Either keyPair and attr or mnemonic must be present.',
      statusCode: 400,
      errorCode: 'transaction.mnemonic.keyPair.missing',
    });
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
    txData = ltcService.prepareTransaction(data, address, chain, amount, mnemonic, keyPair, attr);
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
      currency: LTC,
    }, id, res, headers);
    return;
  } catch (err) {
    r = err.response;
  }

  try {
    await cancelWithdrawal(id, res, headers, 'true', r);
  } catch (_) {
  }
});

module.exports = router;
