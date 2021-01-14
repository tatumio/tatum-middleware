const express = require('express');
const StellarSDK = require('stellar-sdk');
const {
  broadcast, cancelWithdrawal, getAccountXlm, storeWithdrawal,
  getAccountById, getVirtualCurrencyByName,
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
    secret,
    ...withdrawal
  } = body;

  let senderAccount;
  try {
    senderAccount = await getAccountById(withdrawal.senderAccountId, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

  let vc;
  if (senderAccount.currency !== XLM) {
    try {
      vc = await getVirtualCurrencyByName(senderAccount.currency, headers);
    } catch (e) {
      return res.status(403).json({
        message: 'Unsupported account currency.',
        statusCode: 403,
        errorCode: 'account.currency',
      });
    }
  }

  withdrawal.fee = '0.00001';
  let acc;
  try {
    acc = await getAccountXlm(StellarSDK.Keypair.fromSecret(secret).publicKey(), res, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

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
    acc.sequenceNumber = () => acc.sequence;
    acc.accountId = () => acc.account_id;
    acc.incrementSequenceNumber = () => {
      acc.sequence += 1;
    };
    const tx = builder.addOperation(StellarSDK.Operation.payment({
      destination: address,
      asset: vc ? new StellarSDK.Asset(vc.name, vc.issuerAccount) : StellarSDK.Asset.native(),
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
    await cancelWithdrawal(id, res, headers, 'true', r);
  } catch (_) {
  }
});

module.exports = router;
