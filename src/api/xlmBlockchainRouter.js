const express = require('express');
const StellarSDK = require('stellar-sdk');
const {broadcastXlm, getAccountXlm} = require('../service/coreService');

const router = express.Router();

let network;
if (process.env.MODE === 'MAINNET') {
  network = StellarSDK.Networks.PUBLIC;
} else {
  network = StellarSDK.Networks.TESTNET;
}

router.get('/account', (req, res) => {
  const wallet = StellarSDK.Keypair.random();
  res.json({address: wallet.publicKey(), secret: wallet.secret()});
});

router.post('/transaction', async ({headers, body}, res) => {
  const {
    fromAccount,
    fromSecret,
    to,
    amount,
    message,
    token,
    issuerAccount,
  } = body;

  const {sequence} = await getAccountXlm(fromAccount, res, headers);
  let memo;
  if (message) {
    memo = message.length > 28 ? StellarSDK.Memo.hash(message) : StellarSDK.Memo.text(message);
  }
  const tx = new StellarSDK.TransactionBuilder(new StellarSDK.Account(fromAccount, sequence), {
    fee: 100,
    networkPassphrase: network,
    memo,
  })
    .addOperation(StellarSDK.Operation.payment({
      destination: to,
      asset: token ? new StellarSDK.Asset(token, issuerAccount) : StellarSDK.Asset.native(),
      amount,
    }))
    .setTimeout(30)
    .build();
  tx.sign(StellarSDK.Keypair.fromSecret(fromSecret));
  try {
    await broadcastXlm({
      txData: tx.toEnvelope().toXDR().toString('base64'),
    }, res, headers);
  } catch (_) {
  }
});

router.post('/trust', async ({headers, body}, res) => {
  const {
    fromAccount,
    fromSecret,
    limit,
    issuerAccount,
    token,
  } = body;

  const {sequence} = await getAccountXlm(fromAccount, res, headers);
  const tx = new StellarSDK.TransactionBuilder(new StellarSDK.Account(fromAccount, sequence), {
    fee: 100,
    networkPassphrase: network,
  })
    .addOperation(StellarSDK.Operation.changeTrust({
      limit,
      asset: new Asset(token, issuerAccount),
    }))
    .setTimeout(30)
    .build();
  tx.sign(StellarSDK.Keypair.fromSecret(fromSecret));
  try {
    await broadcastXlm({
      txData: tx.toEnvelope().toXDR().toString('base64'),
    }, res, headers);
  } catch (_) {
  }
});

module.exports = router;
