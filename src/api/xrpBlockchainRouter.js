const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {broadcastXrp, getFeeXrp, getAccountXrp} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

router.get('/account', (req, res) => {
  const {address, secret} = offlineApi.generateAddress();
  res.json({address, secret});
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
  let account;

  try {
    f = fee || await getFeeXrp(res, headers);
    account = await getAccountXrp(fromAccount, res, headers);
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
    const prepared = await offlineApi.preparePayment(fromAccount, payment, {
      fee: `${f}`,
      sequence: account.account_data.Sequence,
      maxLedgerVersion: account.ledger_current_index + 5
    });
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

router.post('/trust', async ({headers, body}, res) => {
  const {
    fromAccount,
    fromSecret,
    token,
    issuerAccount,
    fee,
    limit,
  } = body;

  let f;
  let account;

  try {
    f = fee || await getFeeXrp(res, headers);
    account = await getAccountXrp(fromAccount, res, headers);
  } catch (e) {
    console.error(e);
    return;
  }

  let signedTransaction;
  try {
    const prepared = await offlineApi.prepareTrustline(fromAccount, {
      currency: token,
      counterparty: issuerAccount,
      limit,
      ripplingDisabled: true,
    }, {fee: `${f}`, sequence: account.account_data.Sequence, maxLedgerVersion: account.ledger_current_index + 5});
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
