const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');
const axios = require('axios');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const {broadcastEth} = require('./coreService');

const {
  ROPSTEN, ETH_DERIVATION_PATH, TESTNET_DERIVATION_PATH,
} = require('../constants');

const generateWallet = (chain, mnemonic) => {
  const path = chain === ROPSTEN ? TESTNET_DERIVATION_PATH : ETH_DERIVATION_PATH;
  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
  const derivePath = hdwallet.derivePath(path);
  return {xpub: derivePath.publicExtendedKey(), xpriv: derivePath.privateExtendedKey()};
};

const getGasPriceInWei = async (res) => {
  try {
    const {data} = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    return Web3.utils.toWei(new BigNumber(data.fast).dividedBy(10).toString(), 'gwei');
  } catch (e) {
    console.error(e);
    res.status(403).send({code: 'gas.price.failed', message: 'Unable to estimate gas price.'});
    throw e;
  }
};

const calculateAddress = (pub, i) => {
  const w = hdkey.fromExtendedKey(pub);
  const child = w.deriveChild(i);
  return `0x${child.getWallet().getAddress().toString('hex').toLowerCase()}`;
};

const calculatePrivateKey = (chain, mnemonic, i) => {
  const path = chain === ROPSTEN ? TESTNET_DERIVATION_PATH : ETH_DERIVATION_PATH;

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
  const derivePath = hdwallet.derivePath(path).deriveChild(i);
  return derivePath.getWallet().getPrivateKeyString();
};

const scCall = async (web3, res, privKey, contractAddress, nonce, fee, methodABI, methodName, params) => {
  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await this.getGasPriceInWei(res);
  const contract = new web3.eth.Contract([methodABI], contractAddress);
  const tx = {
    from: 0,
    to: contractAddress.trim(),
    data: contract.methods[methodName](...params).encodeABI(),
    gasPrice,
    nonce,
  };

  if (fee) {
    tx.gas = fee.gasLimit;
  } else {
    try {
      tx.gas = await web3.eth.estimateGas(tx);
    } catch (e) {
      console.error(e);
      res.status(403).send({code: 'gas.price.failed', message: 'Unable to estimate gas price.'});
      throw e;
    }
  }
  try {
    return (await web3.eth.accounts.signTransaction(tx, privKey)).rawTransaction;
  } catch (e) {
    console.error(e);
    res.status(403).send({code: 'eth.transaction.hash', message: 'Unable to calculate transaction hash.'});
    throw e;
  }
};

const erc721Transaction = async (web3, res, privKey, to, data, nonce, fee) => {
  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei(res);
  const tx = {
    from: 0,
    to: to.trim(),
    data,
    gasPrice,
    nonce,
  };

  if (fee) {
    tx.gas = fee.gasLimit;
  } else {
    try {
      tx.gas = await web3.eth.estimateGas(tx);
    } catch (e) {
      console.error(e);
      res.status(403).send({code: 'gas.price.failed', message: 'Unable to estimate gas price.'});
      throw e;
    }
  }
  try {
    return (await web3.eth.accounts.signTransaction(tx, privKey)).rawTransaction;
  } catch (e) {
    console.error(e);
    res.status(403).send({code: 'eth.transaction.hash', message: 'Unable to calculate transaction hash.'});
    throw e;
  }
};

const blockchainTransaction = async (fee, transaction, fromPriv, web3, res, headers) => {
  const tx = {...transaction};
  if (fee) {
    tx.gas = fee.gasLimit;
  } else {
    try {
      tx.gas = await web3.eth.estimateGas(tx);
    } catch (e) {
      console.error(e);
      res.status(403).json({
        error: 'Unable to calculate gas limit for transaction',
        code: 'eth.transaction.gas',
      });
      return;
    }
  }
  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      error: 'Unable to sign transaction',
      code: 'eth.transaction.gas',
    });
    return;
  }

  try {
    await broadcastEth({
      txData: txData.rawTransaction,
    }, res, headers);
  } catch (_) {
  }
};

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey,
  blockchainTransaction,
  erc721Transaction,
  getGasPriceInWei,
  scCall,
};
