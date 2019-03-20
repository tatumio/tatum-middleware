const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')
const hdkey = require('hdkey')

const {BTC, TBTC, BTC_DERIVATION_PATH, TESTNET_DERIVATION_PATH} = require('../constants')

const generateWallet = (chain, mnemonic) => {
  let path, versions
  switch (chain) {
    case TBTC:
      path = TESTNET_DERIVATION_PATH
      versions = bitcoin.networks.testnet.bip32
      break
    case BTC:
      path = BTC_DERIVATION_PATH
      versions = bitcoin.networks.bitcoin.bip32
      break
  }

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic), versions)
  return hdwallet.derive(path).toJSON()
}

const calculateAddress = (xpub, chain, index) => {
  const w = bitcoin.HDNode.fromBase58(xpub, chain === BTC ? bitcoin.networks.bitcoin : bitcoin.networks.testnet)
  return w.derivePath("" + index).keyPair.getAddress()
}

const calculatePrivateKey = (chain, mnemonic, i) => {
  let path, network
  switch (chain) {
    case TBTC:
      path = TESTNET_DERIVATION_PATH
      network = bitcoin.networks.testnet
      break
    case BTC:
      path = BTC_DERIVATION_PATH
      network = bitcoin.networks.bitcoin
      break
  }
  const w = bitcoin.HDNode.fromSeedBuffer(bip39.mnemonicToSeed(mnemonic), network)
  return w.derivePath(path).derive(i).keyPair.toWIF()
}

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey
}
