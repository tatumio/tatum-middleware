const bip39 = require('bip39');

const generateMnemonic = mnemonic => (mnemonic || bip39.generateMnemonic(256));

module.exports = {
  generateMnemonic,
};
