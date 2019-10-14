const bip39 = require('bip39');
const jwt = require('jsonwebtoken');

const generateMnemonic = () => bip39.generateMnemonic();

const generateJwt = (key, secret) => jwt.sign({ apiKey: key, created: Date.now() }, secret);

module.exports = {
  generateMnemonic,
  generateJwt,
};
