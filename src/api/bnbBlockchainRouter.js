const express = require('express');
const {broadcastBnb} = require('../service/coreService');
const commonService = require('../service/commonService');
const bnbService = require('../service/bnbService');

const router = express.Router();

const {
  BNB, TBNB,
} = require('../constants');

const chain = process.env.API_URL.includes('api') ? BNB : TBNB;

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic(256);
  const wallet = bnbService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/address/:pub/:i', ({params}, res) => {
  const {i, pub} = params;
  const address = bnbService.calculateAddress(pub, chain, parseInt(i));
  res.send({address});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  const key = bnbService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
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
    res.status(400).json({error: 'Unable to calculate address from private key.', code: 'bnb.private.key.mismatch'});
    return;
  }
  const txData = await bnbService.prepareTransaction(chain, addressFrom, res, to, currency, amount, message, fromPrivateKey, headers);
  await broadcastBnb({txData}, res, headers);
});

module.exports = router;
