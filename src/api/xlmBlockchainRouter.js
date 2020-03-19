const express = require('express');
const StellarSDK = require('stellar-sdk');
const {broadcastXlm, getAccountXlm, getFeeXlm} = require('../service/coreService');

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
  } = body;

  const fee = await getFeeXlm(res, headers);
  const {sequence} = await getAccountXlm(fromAccount, res, headers);
  const tx = new StellarSDK.TransactionBuilder(new StellarSDK.Account(fromAccount, sequence), {
    fee,
    networkPassphrase: network,
    memo: message ? StellarSDK.Memo.text(message) : undefined,
  })
    .addOperation(StellarSDK.Operation.payment({
      destination: to,
      asset: StellarSDK.Asset.native(),
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

module.exports = router;
