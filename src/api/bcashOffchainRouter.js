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
  if (!mnemonic && (!keyPair || !attr)) {
    res.send(400).json({
      message: 'Keypair and attr must be present.',
      statusCode: 400,
      errorCode: 'transaction.attr.keyPair.missing',
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
    await cancelWithdrawal(id, res, headers, 'true', r);
  } catch (_) {
  }
});

module.exports = router;
