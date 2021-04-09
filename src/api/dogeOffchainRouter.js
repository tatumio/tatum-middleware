const express = require('express');
const {sendDogecoinOffchainTransaction} = require('@tatumio/tatum');

const router = express.Router();

router.post('/transfer', async ({body}, res) => {
  try {
    const result = await sendDogecoinOffchainTransaction(process.env.MODE !== 'MAINNET', body);
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: `Unable to sign transaction for transaction. Reason: ${e}`,
      statusCode: 403,
      errorCode: 'doge.failed',
    });
  }
});

module.exports = router;
