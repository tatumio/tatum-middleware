const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');
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

const blockchainTransaction = async (fee, transaction, fromPriv, web3, res, headers) => {
  const tx = {...transaction};
  if (fee) {
    tx.gas = fee.gasLimit;
  } else {
    try {
      tx.gas = await web3.eth.estimateGas(tx);
    } catch (e) {
      console.error(e);
      res.status(500).json({
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
    res.status(500).json({
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
};
