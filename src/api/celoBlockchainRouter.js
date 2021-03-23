const express = require('express');
const {
  generateWallet, generatePrivateKeyFromMnemonic,
  prepareCeloDeployErc721SignedTransaction,
  Currency, sendCeloOrcUsdTransaction,
  prepareCeloMintErc721SignedTransaction,
  prepareCeloTransferErc721SignedTransaction,
  prepareCeloBurnErc721SignedTransaction,
  prepareCeloMintMultipleErc721SignedTransaction,
} = require('@tatumio/tatum');
const {broadcastCelo} = require('../service/coreService');

const router = express.Router();

router.get('/wallet', async (req, res) => {
  res.json(await generateWallet(Currency.CELO, process.env.MODE !== 'MAINNET', req.query.mnemonic));
});

router.post('/wallet/priv', async ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  res.json({key: await generatePrivateKeyFromMnemonic(Currency.CELO, process.env.MODE !== 'MAINNET', mnemonic, i)});
});

router.post('/transaction', async ({body}, res) => {
  try {
    res.status(200).json(await sendCeloOrcUsdTransaction(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
  }
});
router.post('/erc721/deploy', async ({body, headers}, res) => {
  let txData;
  try {
    body.chain = Currency.CELO;
    txData = await prepareCeloDeployErc721SignedTransaction(process.env.MODE !== 'MAINNET', body);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
    return;
  }
  try {
    await broadcastCelo({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/transaction', async ({body, headers}, res) => {
  let txData;
  try {
    body.chain = Currency.CELO;
    txData = await prepareCeloTransferErc721SignedTransaction(process.env.MODE !== 'MAINNET', body);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
    return;
  }
  try {
    await broadcastCelo({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/mint', async ({body, headers}, res) => {
  let txData;
  try {
    body.chain = Currency.CELO;
    txData = await prepareCeloMintErc721SignedTransaction(process.env.MODE !== 'MAINNET', body);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
    return;
  }
  try {
    await broadcastCelo({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/mint/batch', async ({body, headers}, res) => {
  let txData;
  try {
    body.chain = Currency.CELO;
    txData = await prepareCeloMintMultipleErc721SignedTransaction(process.env.MODE !== 'MAINNET', body);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
    return;
  }
  try {
    await broadcastCelo({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/burn', async ({body, headers}, res) => {
  let txData;
  try {
    body.chain = Currency.CELO;
    txData = await prepareCeloBurnErc721SignedTransaction(process.env.MODE !== 'MAINNET', body);
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'celo.error',
    });
    return;
  }
  try {
    await broadcastCelo({txData}, res, headers);
  } catch (_) {
  }
});

module.exports = router;
