const express = require('express');
const tatum = require('@tatumio/tatum');

const router = express.Router();

router.get('/wallet', async (req, res) => {
  res.json(await tatum.generateTronWallet());
});

router.post('/transaction', async ({body, headers}, res) => {
  try {
    process.env.TATUM_API_KEY = headers['x-api-key'];
    res.status(200).json(await tatum.sendTronTransaction(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'tron.error',
    });
  }
});

module.exports = router;
