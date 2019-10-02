const express = require('express');
const BigNumber = require('bignumber.js');
const Xrp = require('ripple-lib').RippleAPI;
const {storeWithdrawal, cancelWithdrawal, broadcast, broadcastXrp} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

const {XRP, TXRP} = require('../constants');

const chain = process.env.API_URL.includes('api-') ? XRP : TXRP;

router.get('/wallet', (req, res) => {
  const wallet = offlineApi.generateAddress();
  res.json(wallet);
});

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
