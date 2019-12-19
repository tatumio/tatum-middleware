const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {broadcastXrp, getFeeXrp} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

router.get('/account', (req, res) => {
  const wallet = offlineApi.generateAddress();
  res.json(wallet);
});

router.post('/transaction', async ({headers, body}, res) => {
  const {
    fromAccount,
    fromSecret,
    to,
    amount,
    fee,
    sourceTag,
    destinationTag,
  } = body;

  let f;

  try {
    f = fee || await getFeeXrp(res, headers);
  } catch (e) {
    console.error(e);
    return;
  }

  const payment = {
    source: {
      address: fromAccount,
      amount: {
        currency: 'drops',
        value: `${amount * 1000000}`,
      },
      tag: sourceTag,
    },
    destination: {
      address: to,
      minAmount: {
        currency: 'drops',
        value: `${amount * 1000000}`,
      },
      tag: destinationTag,
    },
  };

  let signedTransaction;
  try {
    const prepared = await offlineApi.preparePayment(fromAccount, payment, {fee: `${f}`});
    signedTransaction = (await offlineApi.sign(prepared.txJSON, fromSecret)).signedTransaction;
  } catch (e) {
    console.error(e);
    res.status(500).send({
      error: 'Unable to sign transaction.',
      code: 'xrp.sign.failed',
    });
    return;
  }
  try {
    await broadcastXrp({
      txData: signedTransaction,
    }, res, headers);
  } catch (_) {
  }
});

module.exports = router;
