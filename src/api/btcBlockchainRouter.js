const express = require('express');
const router = express.Router();
const {TBTC, BTC} = require('../constants');
const commonService = require('../service/commonService');
const btcService = require('../service/btcService');

const chain = process.env.API_URL.includes('api-') ? BTC : TBTC;

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = btcService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/wallet/xpub/:xpub/:i', ({params}, res) => {
  const {i, xpub} = params;
  const index = parseInt(i);

  const address = btcService.calculateAddress(xpub, chain, index);
  res.send({address});
});

router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  const key = btcService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

module.exports = router;
