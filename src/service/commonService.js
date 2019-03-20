const bip39 = require('bip39')

const generateMnemonic = () => bip39.generateMnemonic()

module.exports = {
  generateMnemonic
}
