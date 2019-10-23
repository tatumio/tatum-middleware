const bip39 = require('bip39');
const jwt = require('jsonwebtoken');

const generateMnemonic = strength => bip39.generateMnemonic(strength);

const generateJwt = (key, secret) => jwt.sign({ apiKey: key, created: Date.now() }, secret);

module.exports = {
  generateMnemonic,
  generateJwt,
};
