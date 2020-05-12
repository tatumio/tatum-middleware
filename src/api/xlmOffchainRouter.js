const express = require('express');
const StellarSDK = require('stellar-sdk');
const {
  broadcast, cancelWithdrawal, getAccountXlm, storeWithdrawal,
} = require('../service/coreService');
const {XLM} = require('../constants');

const router = express.Router();

let network;
if (process.env.MODE === 'MAINNET') {
  network = StellarSDK.Networks.PUBLIC;
} else {
  network = StellarSDK.Networks.TESTNET;
}

router.post('/transfer', async ({headers, body}, res) => {
  const {
    account, secret,
    token,
    issuerAccount,
    ...withdrawal
  } = body;

  withdrawal.fee = '0.00001';
  const acc = await getAccountXlm(account, res, headers);

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  const {amount, address} = withdrawal;

  let memo;
  if (withdrawal.attr) {
    memo = withdrawal.attr.length > 28 ? StellarSDK.Memo.hash(withdrawal.attr) : StellarSDK.Memo.text(withdrawal.attr);
  } else {
    memo = undefined;
  }
  const builder = new StellarSDK.TransactionBuilder(acc, {
    fee: 100,
    networkPassphrase: network,
    memo,
  }).setTimeout(30);

  let txData;
  try {
    const tx = builder.addOperation(StellarSDK.Operation.payment({
      destination: address,
      asset: token ? new StellarSDK.Asset(token, issuerAccount) : StellarSDK.Asset.native(),
      amount,
    })).build();
    tx.sign(StellarSDK.Keypair.fromSecret(secret));
    txData = tx.toEnvelope().toXDR().toString('base64');
  } catch (e) {
    console.error(e);
    try {
      await cancelWithdrawal(id, res, headers);
    } catch (_) {
    }
    return;
  }
  let r;
  try {
    await broadcast({
      txData,
      withdrawalId: id,
      currency: XLM,
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
