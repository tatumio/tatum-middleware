const express = require('express');
const {broadcast, storeWithdrawal, cancelWithdrawal} = require('../service/coreService');
const bnbService = require('../service/bnbService');
const {getAccountById} = require('../service/coreService');

const router = express.Router();

const {
  BNB, TBNB,
} = require('../constants');

const chain = process.env.MODE === 'MAINNET' ? BNB : TBNB;

router.post('/transfer', async ({headers, body}, res) => {
  const {
    privateKey,
    ...withdrawal
  } = body;

  withdrawal.fee = '0.000375';
  let senderAccount;
  try {
    senderAccount = await getAccountById(withdrawal.senderAccountId, headers);
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    return res.status(e.response.status).json(e.response.data);
  }

  if (senderAccount.currency !== BNB) {
    return res.status(403).json({
      message: 'Unsupported account currency.',
      statusCode: 403,
      errorCode: 'account.currency',
    });
  }

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  const {amount, address} = withdrawal;

  let addressFrom;
  try {
    addressFrom = bnbService.calculateAddressFromPrivateKey(chain, privateKey);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: 'Unable to calculate address from private key.',
      statusCode: 400,
      errorCode: 'bnb.private.key.mismatch',
    });
    return;
  }
  let txData;
  try {
    txData = await bnbService.prepareTransaction(chain, addressFrom, res, address, senderAccount.currency, amount, withdrawal.attr, privateKey, headers);
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
      currency: BNB,
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
