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
    token,
    issuerAccount,
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

  const currency = token || 'XRP';
  const payment = {
    source: {
      address: account,
      maxAmount: {
        currency,
        counterparty: issuerAccount,
        value: amount,
      },
      tag: sourceTag,
    },
    destination: {
      address: to,
      amount: {
        currency,
        counterparty: issuerAccount,
        value: amount,
      },
      tag: destinationTag,
    },
  };

  let signedTransaction;
  try {
    const prepared = await offlineApi.preparePayment(fromAccount, payment, {
      fee: `${f}`,
      sequence: account.account_data.Sequence,
      maxLedgerVersion: account.ledger_current_index + 5,
    });
    signedTransaction = (await offlineApi.sign(prepared.txJSON, fromSecret)).signedTransaction;
  } catch (e) {
    console.error(e);
    res.status(403).send({
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
    res.status(403).send({
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

router.post('/account/settings', async ({headers, body}, res) => {
  const {
    fromAccount,
    fromSecret,
    rippling,
    requireDestinationTag,
    fee,
  } = body;

  if (requireDestinationTag !== undefined && rippling !== undefined) {
    res.status(403).send({
      error: 'It is possible to set 1 parameter at a time.',
      code: 'xrp.settings.multiple',
    });
    return;
  }
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
    const settings = rippling === undefined ? {requireDestinationTag} : {defaultRipple: rippling};
    const prepared = await offlineApi.prepareSettings(fromAccount, settings, {fee: `${f}`, sequence: account.account_data.Sequence, maxLedgerVersion: account.ledger_current_index + 5});
    signedTransaction = (await offlineApi.sign(prepared.txJSON, fromSecret)).signedTransaction;
  } catch (e) {
    console.error(e);
    res.status(403).send({
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
