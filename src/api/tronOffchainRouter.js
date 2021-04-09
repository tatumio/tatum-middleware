const {
  generatePrivateKeyFromMnemonic, generateAddressFromXPub, TrcType,
  prepareTronCreateTrc20SignedTransaction,
  prepareTronCreateTrc10SignedTransaction,
  Currency, sendTronOffchainTransaction,
} = require('@tatumio/tatum');
const express = require('express');
const BigNumber = require('bignumber.js');
const {
  registerTrc, broadcastTron,
} = require('../service/coreService');


const router = express.Router();

router.post('/transfer', async ({body}, res) => {
  try {
    const result = await sendTronOffchainTransaction(process.env.MODE !== 'MAINNET', body);
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: `Unable to sign transaction for transaction. Reason: ${e}`,
      statusCode: 403,
      errorCode: 'tron.failed',
    });
  }
});

router.post('/trc/deploy', async ({body, headers}, res) => {
  const {
    mnemonic, index, from, fromPrivateKey, signatureId, ...deploy
  } = body;
  deploy.chain = Currency.TRON;

  let key;
  if (mnemonic && index !== undefined) {
    key = (await generatePrivateKeyFromMnemonic(Currency.TRON, true, mnemonic, index));
  } else {
    key = fromPrivateKey;
  }
  const recipient = deploy.address || generateAddressFromXPub(Currency.TRON, true, deploy.xpub, deploy.derivationIndex);
  let response;
  try {
    response = await registerTrc(deploy, res, headers);
  } catch (e) {
    return;
  }

  let txData;
  try {
    txData = deploy.type === TrcType.TRC20
      ? await prepareTronCreateTrc20SignedTransaction(true, {
        decimals: deploy.decimals,
        fromPrivateKey: key,
        name: deploy.symbol,
        recipient,
        symbol: deploy.symbol,
        totalSupply: new BigNumber(deploy.supply).toNumber(),
      })
      : await prepareTronCreateTrc10SignedTransaction(true, {
        abbreviation: deploy.supply,
        decimals: deploy.decimals,
        description: deploy.description,
        url: deploy.url,
        fromPrivateKey: key,
        name: deploy.symbol,
        totalSupply: new BigNumber(deploy.supply).toNumber(),
      });
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: `Unable to sign transaction for contract creation. Reason: ${e}`,
      statusCode: 403,
      errorCode: 'tron.trc.sign',
    });
    return;
  }

  try {
    const r = await broadcastTron({
      txData,
    }, res, headers, false);
    res.status(200).json({txId: r.txId, id: response.data.accountId});
  } catch (_) {
  }
});

module.exports = router;
