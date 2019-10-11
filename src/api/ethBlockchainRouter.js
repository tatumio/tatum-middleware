const express = require('express');
const axios = require('axios');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {broadcastEth} = require('../service/coreService');

const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const commonService = require('../service/commonService');
const ethService = require('../service/ethService');

const router = express.Router();

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const chain = process.env.API_URL.includes('api') ? ETH : ROPSTEN;

const getGasPriceInWei = async (res) => {
  try {
    const {data} = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    return Web3.utils.toWei(new BigNumber(data.fast).dividedBy(10).toString(), 'gwei');
  } catch (e) {
    console.error(e);
    res.status(500).send({code: 'gas.price.failed', message: 'Unable to estimate gas price.'});
    throw e;
  }
};

router.get('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = ethService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/wallet/xpub/:pub/:i', ({params}, res) => {
  const {i, pub} = params;
  const address = ethService.calculateAddress(pub, i);
  res.send({address});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  const key = ethService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    currency,
    fee,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei();

  let tx;
  if (currency === 'ETH') {
    tx = {
      from: 0,
      to: to.trim(),
      value: web3.utils.toWei(amount, 'ether'),
      gasPrice,
      nonce,
    };
  } else {
    if (!Object.keys(CONTRACT_ADDRESSES).includes(currency)) {
      res.status(400).json({
        error: 'Unsupported ETH ERC20 blockchain.',
        code: 'eth.erc20.unsupported',
      });
      return;
    }
    const contract = new web3.eth.Contract(tokenABI, CONTRACT_ADDRESSES[currency]);

    tx = {
      from: 0,
      to: CONTRACT_ADDRESSES[currency],
      data: contract.methods.transfer(to.trim(), new BigNumber(amount).multipliedBy(10).pow(CONTRACT_DECIMALS[currency]).toString(16)).encodeABI(),
      gasPrice,
      nonce,
    };
  }

  await ethService.blockchainTransaction(fee, tx, fromPrivateKey, web3, res, headers);
});

router.post('/erc20/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    fee,
    contractAddress,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei();
  const contract = new web3.eth.Contract(tokenABI, contractAddress);

  const tx = {
    from: 0,
    to: contractAddress.trim(),
    data: contract.methods.transfer(to.trim(), `0x${new BigNumber(amount).multipliedBy(new BigNumber(10).pow(18)).toString(16)}`).encodeABI(),
    gasPrice,
    nonce,
  };

  await ethService.blockchainTransaction(fee, tx, fromPrivateKey, web3, res, headers);
});

router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {
    name,
    address,
    symbol,
    supply,
    digits,
    fromPrivateKey,
    fee,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei();

  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode,
  });
  const deploy = contract.deploy({
    arguments: [
      name,
      symbol,
      address,
      digits,
      `0x${new BigNumber(supply).multipliedBy(new BigNumber(10).pow(digits)).toString(16)}`,
      `0x${new BigNumber(supply).multipliedBy(new BigNumber(10).pow(digits)).toString(16)}`,
    ],
  });

  let gasLimit;
  try {
    gasLimit = fee ? fee.gasLimit : await web3.eth.estimateGas({
      from: 0,
      data: deploy.encodeABI(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to calculate gas limit for transaction',
      code: 'eth.transaction.gas',
    });
    return;
  }

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction({
      from: 0,
      gasLimit,
      gasPrice,
      data: deploy.encodeABI(),
      nonce,
    }, fromPrivateKey);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to sign transaction for contract creation.',
      code: 'eth.erc20.sign',
    });
    return;
  }

  try {
    await broadcastEth({
      txData: txData.rawTransaction,
    }, res, headers);
  } catch (_) {
  }
});

module.exports = router;
