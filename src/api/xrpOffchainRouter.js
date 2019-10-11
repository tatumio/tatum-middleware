const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {storeWithdrawal, cancelWithdrawal, broadcast} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

const {XRP, TXRP} = require('../constants');

const chain = process.env.API_URL.includes('api') ? XRP : TXRP;

router.post('/transfer', async ({headers, body}, res) => {
  const {
    account, secret, destinationTag, ...withdrawal
  } = body;

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
      withdrawal.fee = await api.getFee();
    } catch (e) {
      console.error(e);
      res.status(500).send({
        error: 'Unable to calculate fee.',
        code: 'withdrawal.fee',
      });
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
      const prepared = await api.preparePayment(account, payment, {fee: `${fee}`});
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
  }).then(() => api.disconnect())
    .catch((e) => {
      console.error(e);
      res.status(500).send({
        error: 'Unable to connect to blockchain.',
        code: 'withdrawal.connection',
      });
    });
});

module.exports = router;
