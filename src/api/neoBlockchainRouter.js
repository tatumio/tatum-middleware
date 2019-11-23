const express = require('express');
const {create, sendAsset, doInvoke, claimGas} = require('@cityofzion/neon-js').default;
const Neon = require('@cityofzion/neon-js');

const router = express.Router();

const network = process.env.API_URL.includes('api') ? 'MainNet' : 'TestNet';

router.get('/wallet', (_, res) => {
  const privateKey = create.privateKey();
  res.json({privateKey, address: new Neon.wallet.Account(privateKey).address});
});

router.post('/transaction', async ({body}, res) => {
  const {fromPrivateKey, to, assets} = body;
  const intents = Neon.api.makeIntent(assets, to);
  const account = new Neon.wallet.Account(fromPrivateKey);
  try {
    const {response} = await sendAsset({api: new Neon.api.neoscan.instance(network), account, intents});
    res.json({txId: response.txid});
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: `Unable to transfer assets. ${e}`,
      code: 'neo.transaction.failed',
    });
  }
});

router.post('/claim', async ({body}, res) => {
  const account = new Neon.wallet.Account(body.privateKey);
  try {
    const response = await claimGas({api: new Neon.api.neoscan.instance(network), account});
    res.json({txId: response.txid});
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: `Unable to claim gas. ${e}`,
      code: 'neo.gas.failed',
    });
  }
});

router.post('/invoke', async ({body}, res) => {
  const {
    fromPrivateKey, to, scriptHash, numOfDecimals, amount, additionalInvocationGas,
  } = body;
  const account = new Neon.wallet.Account(fromPrivateKey);
  const generator = Neon.nep5.abi.transfer(scriptHash, account.address, to, amount * numOfDecimals);
  const builder = generator();
  const script = builder.str;
  try {
    const {response} = await doInvoke({
      api: new Neon.api.neoscan.instance(network),
      account,
      script,
      gas: additionalInvocationGas,
    });
    res.json({txId: response.txid});
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: `Unable to transfer assets. ${e}`,
      code: 'neo.contract.failed',
    });
  }
});

module.exports = router;
