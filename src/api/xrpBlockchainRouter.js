const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {broadcastXrp} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

const {XRP, TXRP} = require('../constants');

const chain = process.env.API_URL.includes('api-') ? XRP : TXRP;

router.get('/wallet', (req, res) => {
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

  const api = new Xrp({server: chain === XRP ? 'wss://s1.ripple.com' : 'wss://s.altnet.rippletest.net:51233'});
  api.on('error', (errorCode, errorMessage) => {
    console.log(`${errorCode}: ${errorMessage}`);
    res.status(500).json({
      error: 'Unable to connect to XRP server.',
      errorCode: 'withdrawal.connect',
      data: {
        originalErrorCode: errorCode,
        originalErrorMessage: errorMessage,
      },
    });
  });

  api.connect().then(async () => {
    try {
      f = fee || await api.getFee();
    } catch (e) {
      console.error(e);
      res.status(500).send({
        error: 'Unable to calculate fee.',
        code: 'withdrawal.fee',
      });
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
      const prepared = await api.preparePayment(fromAccount, payment, {fee: `${f}`});
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
  }).then(() => api.disconnect())
    .catch((e) => {
      console.error(e);
      res.status(500).send({
        error: 'Unable to connect to blockchain.',
        code: 'transaction.connection',
      });
    });
});

module.exports = router;
