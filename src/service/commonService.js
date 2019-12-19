const bip39 = require('bip39');

const generateMnemonic = strength => bip39.generateMnemonic(strength);

module.exports = {
  generateMnemonic,
};
