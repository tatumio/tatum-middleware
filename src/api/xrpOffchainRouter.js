const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {
  storeWithdrawal, cancelWithdrawal, broadcast, getFeeXrp,
} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

const {XRP} = require('../constants');

router.post('/transfer', async ({headers, body}, res) => {
  const {
    account, secret, destinationTag, ...withdrawal
  } = body;

  try {
    withdrawal.fee = await getFeeXrp(res, headers);
  } catch (e) {
    console.error(e);
    return;
  }

  let resp;
  try {
    resp = await storeWithdrawal({...withdrawal, attr: `${destinationTag}`}, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  const {amount, fee, address} = withdrawal;

  const payment = {
    source: {
      address: account,
      amount: {
        currency: 'drops',
        value: `${amount * 1000000}`,
      },
    },
    destination: {
      address,
      minAmount: {
        currency: 'drops',
        value: `${amount * 1000000}`,
      },
      tag: destinationTag,
    },
  };

  let signedTransaction;
  try {
    const prepared = await offlineApi.preparePayment(account, payment, {fee: `${fee}`});
    signedTransaction = (await offlineApi.sign(prepared.txJSON, secret)).signedTransaction;
  } catch (e) {
    console.error(e);
    try {
      await cancelWithdrawal(id, res, headers);
    } catch (_) {
    }
    return;
  }
  try {
    await broadcast({
      txData: signedTransaction,
      withdrawalId: id,
      currency: XRP,
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
