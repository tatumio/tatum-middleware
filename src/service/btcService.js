const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const hdkey = require('hdkey');
const BigNumber = require('bignumber.js');

const {
  BTC, TBTC, BTC_DERIVATION_PATH, TESTNET_DERIVATION_PATH,
} = require('../constants');

const generateWallet = (chain, mnemonic) => {
  let path;
  let versions;
  if (chain === TBTC) {
    path = TESTNET_DERIVATION_PATH;
    versions = bitcoin.networks.testnet.bip32;
  } else {
    path = BTC_DERIVATION_PATH;
    versions = bitcoin.networks.bitcoin.bip32;
  }

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic), versions);
  return hdwallet.derive(path).toJSON();
};

const calculateAddress = (xpub, chain, index) => {
  const w = bitcoin.HDNode.fromBase58(xpub, chain === BTC ? bitcoin.networks.bitcoin : bitcoin.networks.testnet);
  return w.derivePath(`${index}`).keyPair.getAddress();
};

const prepareTransaction = (data, out, chain, amount, mnemonic, keyPair, changeAddress) => {
  const network = chain === BTC ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  const tx = new bitcoin.TransactionBuilder(network);
  data.forEach((input) => {
    if (input.vIn !== '-1') {
      tx.addInput(input.vIn, input.vInIndex);
    }
  });

  tx.addOutput(out, Number(new BigNumber(amount).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
  if (mnemonic) {
    const {xpub} = generateWallet(chain, mnemonic);
    tx.addOutput(calculateAddress(xpub, chain, 0), Number(new BigNumber(data.find(d => d.vIn === '-1').amount).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
  } else if (keyPair && changeAddress) {
    tx.addOutput(changeAddress, Number(new BigNumber(data.find(d => d.vIn === '-1').amount).multipliedBy(100000000).toFixed(8, BigNumber.ROUND_FLOOR)));
  } else {
    throw new Error('Impossible to prepare transaction. Either mnemonic or keyPair and attr must be present.');
  }
  data.forEach((input, i) => {
    // when there is no address field present, input is pool transfer to 0
    if (input.vIn === '-1') {
      return;
    }
    if (mnemonic) {
      const ecPair = bitcoin.ECPair.fromWIF(calculatePrivateKey(chain, mnemonic, input.address ? input.address.derivationKey : 0), network);
      tx.sign(i, ecPair);
    } else {
      const privateKey = keyPair.find(k => k.address === input.address.address);
      const ecPair = bitcoin.ECPair.fromWIF(privateKey.privateKey, network);
      tx.sign(i, ecPair);
    }
  });

  return tx.build().toHex();
};


const calculatePrivateKey = (chain, mnemonic, i) => {
  let path;
  let network;
  if (chain === TBTC) {
    path = TESTNET_DERIVATION_PATH;
    network = bitcoin.networks.testnet;
  } else {
    path = BTC_DERIVATION_PATH;
    network = bitcoin.networks.bitcoin;
  }
  const w = bitcoin.HDNode.fromSeedBuffer(bip39.mnemonicToSeed(mnemonic), network);
  return w.derivePath(path).derive(i).keyPair.toWIF();
};

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey,
  prepareTransaction,
};
