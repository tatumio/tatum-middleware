/* eslint-disable no-restricted-globals */
const express = require('express');
const Xrp = require('ripple-lib').RippleAPI;
const {
  storeWithdrawal, cancelWithdrawal, broadcast, getFeeXrp,
  getAccountXrp, getAccountById,
} = require('../service/coreService');

const offlineApi = new Xrp();
const router = express.Router();

const {XRP} = require('../constants');

router.post('/transfer', async ({headers, body}, res) => {
  const {
    account, secret, token, issuerAccount, sourceTag, ...withdrawal
  } = body;

  if (withdrawal.attr && isNaN(parseInt(withdrawal.attr))) {
    res.status(403).send({
      message: 'Wrong attr of withdrawal, should be of uint32 type.',
      statusCode: 403,
      errorCode: 'attr.wrong.format',
    });
    return;
  }

  let senderAccount;
  try {
    senderAccount = await getAccountById(withdrawal.senderAccountId, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

  if ((senderAccount.currency === XRP && token) || (senderAccount.currency !== XRP && !token)) {
    return res.status(403).json({
      message: 'Unsupported account currency.',
      statusCode: 403,
      errorCode: 'account.currency',
    });
  }

  let acc;
  try {
    acc = await getAccountXrp(account, res, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

  try {
    withdrawal.fee = await getFeeXrp(res, headers);
  } catch (e) {
    console.error(e);
    return;
  }

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  const {amount, fee, address} = withdrawal;

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
      address,
      amount: {
        currency,
        counterparty: issuerAccount,
        value: amount,
      },
    },
  };

  if (withdrawal.attr) {
    payment.destination.tag = parseInt(withdrawal.attr);
  }
  let signedTransaction;
  try {
    const prepared = await offlineApi.preparePayment(account, payment, {
      fee: `${fee}`,
      sequence: acc.account_data.Sequence,
      maxLedgerVersion: acc.ledger_current_index + 5,
    });
    signedTransaction = (await offlineApi.sign(prepared.txJSON, secret)).signedTransaction;
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
      txData: signedTransaction,
      withdrawalId: id,
      currency: XRP,
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
