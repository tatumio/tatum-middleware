const express = require('express');
const {broadcastBnb} = require('../service/coreService');
const bnbService = require('../service/bnbService');

const router = express.Router();

const {
  BNB, TBNB,
} = require('../constants');

const chain = process.env.MODE === 'MAINNET' ? BNB : TBNB;

router.get('/account', (req, res) => {
  const wallet = bnbService.generateWallet(chain);
  res.json(wallet);
});

router.post('/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    currency,
    message,
  } = body;

  let addressFrom;
  try {
    addressFrom = bnbService.calculateAddressFromPrivateKey(chain, fromPrivateKey);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: 'Unable to calculate address from private key.',
      statusCode: 400,
      errorCode: 'bnb.private.key.mismatch',
    });
    return;
  }
  const txData = await bnbService.prepareTransaction(chain, addressFrom, res, to, currency, amount, message, fromPrivateKey, headers);
  await broadcastBnb({txData}, res, headers);
});

module.exports = router;
