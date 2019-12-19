const bitcoin = require('bitcoinjs-lib');
const {Transaction} = require('bsv');
const bip39 = require('bip39');
const hdkey = require('hdkey');
const BigNumber = require('bignumber.js');

const {
  BSV, TBSV, BSV_DERIVATION_PATH, TESTNET_DERIVATION_PATH, BSV_NETWORK_MAINNET, BSV_NETWORK_TESTNET,
} = require('../constants');

const generateWallet = (chain, mnemonic) => {
  let path;
  let versions;
  if (chain === TBSV) {
    path = TESTNET_DERIVATION_PATH;
    versions = BSV_NETWORK_TESTNET.bip32;
  } else {
    path = BSV_DERIVATION_PATH;
    versions = BSV_NETWORK_MAINNET.bip32;
  }

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic), versions);
  return hdwallet.derive(path).toJSON();
};

const calculateAddress = (xpub, chain, index) => {
  const w = bitcoin.HDNode.fromBase58(xpub, chain === BSV ? BSV_NETWORK_MAINNET : BSV_NETWORK_TESTNET);
  return w.derivePath(`${index}`).keyPair.getAddress();
};

const prepareTransaction = (data, out, chain, amount, fee, mnemonic, keyPair, changeAddress) => {
  const network = chain === BSV ? BSV_NETWORK_MAINNET : BSV_NETWORK_TESTNET;
  let tx = new Transaction();
  const privateKeysToSign = [];
  for (const input of data) {
    if (input.vIn !== '-1') {
      tx = tx.from({
        txId: input.vIn,
        vout: input.vInIndex,
        amount: input.amount,
        scriptPubKey: input.scriptPubKey,
      });
      if (mnemonic) {
        const privateKey = calculatePrivateKey(network, mnemonic, input.address && input.address.derivationKey ? input.address.derivationKey : 0);
        privateKeysToSign.push(privateKey);
      } else if (keyPair) {
        const privateKey = keyPair.find(k => k.address === input.address.address);
        if (privateKey) {
          privateKeysToSign.push(privateKey.private);
        }
      }
    }
  }

  tx = tx.to(out, Number(new BigNumber(amount).multipliedBy(100000000).toFixed(0, BigNumber.ROUND_FLOOR)));

  if (mnemonic) {
    const {xpub} = generateWallet(chain, mnemonic);
    tx.change(calculateAddress(xpub, chain, 0));
  } else if (keyPair && changeAddress) {
    tx.change(changeAddress);
  } else {
    throw new Error('Impossible to prepare transaction. Either mnemonic or keyPair and attr must be present.');
  }
  tx.fee(Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0, BigNumber.ROUND_FLOOR))).sign(privateKeysToSign);
  return tx.serialize();
};


const calculatePrivateKey = (chain, mnemonic, i) => {
  let path;
  let network;
  if (chain === TBSV) {
    path = TESTNET_DERIVATION_PATH;
    network = BSV_NETWORK_TESTNET;
  } else {
    path = BSV_DERIVATION_PATH;
    network = BSV_NETWORK_MAINNET;
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
