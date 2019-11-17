const express = require('express');
const {thorify} = require('thorify');
const Web3 = require('web3');

const commonService = require('../service/commonService');
const {broadcastVet} = require('../service/coreService');
const vetService = require('../service/vetService');

const router = express.Router();

const {
  VET, TVET,
} = require('../constants');

const chain = process.env.API_URL.includes('api') ? VET : TVET;

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = vetService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  const key = vetService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    fee,
  } = body;

  const client = thorify(new Web3(), chain === TVET
    ? 'https://vethor-node-test.vechaindev.com/'
    : 'https://vethor-node.vechain.com/');

  client.eth.accounts.wallet.clear();
  client.eth.accounts.wallet.add(fromPrivateKey);
  client.eth.defaultAccount = client.eth.accounts.wallet[0].address;

  try {
    const txData = await vetService.blockchainTransaction(amount, to, fromPrivateKey, fee, client, res, headers);
    await broadcastVet({txData}, res, headers);
  } catch (_) {
  }
});

module.exports = router;
