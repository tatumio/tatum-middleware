const express = require('express');
const {
  generateWallet, generatePrivateKeyFromMnemonic,
  sendCustomBep20Transaction,
  Currency, sendBscOrBep20Transaction,
  sendBscSmartContractMethodInvocationTransaction,
} = require('@tatumio/tatum');

const router = express.Router();

router.get('/wallet', async (req, res) => {
  res.json(await generateWallet(Currency.BSC, process.env.MODE !== 'MAINNET', req.query.mnemonic));
});

router.post('/wallet/priv', async ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  res.json({key: await generatePrivateKeyFromMnemonic(Currency.BSC, process.env.MODE !== 'MAINNET', mnemonic, i)});
});

router.post('/transaction', async ({body}, res) => {
  try {
    res.status(200).json(await sendBscOrBep20Transaction(body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'bsc.error',
    });
  }
});
router.post('/bep20/transaction', async ({body}, res) => {
  try {
    res.status(200).json(await sendCustomBep20Transaction(body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'bsc.error',
    });
  }
});

router.post('/smartcontract', async ({body}, res) => {
  try {
    res.status(200).json(await sendBscSmartContractMethodInvocationTransaction(body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'bsc.error',
    });
  }
});

module.exports = router;
