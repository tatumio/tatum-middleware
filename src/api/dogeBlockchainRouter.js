const express = require('express');
const tatum = require('@tatumio/tatum');

const router = express.Router();

const testnet = process.env.MODE !== 'MAINNET';

router.get('/wallet', async (req, res) => {
  try {
    res.json(await tatum.generateWallet(tatum.Currency.DOGE, testnet, req.query.mnemonic));
  } catch (e) {
    console.error(e);
    res.status(500).json({statusCode: 500, message: 'Internal server error.'});
  }
});

router.post('/wallet/priv', async ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);

  // TODO nejde

  try {
    res.json({key: await tatum.generatePrivateKeyFromMnemonic(tatum.Currency.DOGE, testnet, mnemonic, i)});
  } catch (e) {
    console.error(e);
    res.status(500).json({statusCode: 500, message: 'Internal server error.'});
  }
});

router.post('/transaction', async ({body}, res) => {
  try {
    res.status(200).json(await tatum.sendDogecoinTransaction(body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'doge.error',
    });
  }
});

module.exports = router;
