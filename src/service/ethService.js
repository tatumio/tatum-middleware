const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');

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

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey,
};
