const hdkey = require('ethereumjs-wallet/hdkey')
const bip39 = require('bip39')

const {ETH, ROPSTEN, ETH_DERIVATION_PATH, TESTNET_DERIVATION_PATH} = require('../constants')

const generateWallet = function (chain, mnemonic) {
  let path
  switch (chain) {
    case ROPSTEN:
      path = TESTNET_DERIVATION_PATH
      break
    case ETH:
      path = ETH_DERIVATION_PATH
      break
  }

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))
  const derivePath = hdwallet.derivePath(path)
  return {xpub: derivePath.publicExtendedKey(), xpriv: derivePath.privateExtendedKey()}
}

const calculateAddress = function (pub, i) {
  const w = hdkey.fromExtendedKey(pub)
  const child = w.deriveChild(i)
  return '0x' + child.getWallet().getAddress().toString('hex').toLowerCase()
}

const calculatePrivateKey = function (chain, mnemonic, i) {
  let path
  switch (chain) {
    case ROPSTEN:
      path = TESTNET_DERIVATION_PATH
      break
    case ETH:
      path = ETH_DERIVATION_PATH
      break
  }

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))
  const derivePath = hdwallet.derivePath(path).deriveChild(i)
  return derivePath.getWallet().getPrivateKeyString()
}

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey
}
