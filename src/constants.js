const TBTC = 'TBTC'
const ROPSTEN = 'ropsten'
const BTC = 'BTC'
const ETH = 'mainnet'
const XRP = 'XRP'
const TXRP = 'TXRP'
const ETH_DERIVATION_PATH = 'm/44\'/60\'/0\'/0'
const BTC_DERIVATION_PATH = 'm/44\'/0\'/0\'/0'
const TESTNET_DERIVATION_PATH = 'm/44\'/1\'/0\'/0'

const INFURA_KEY = process.env.INFURA_KEY || '0d81f0f1a8274699be73135db15af8a3'

module.exports = {
  TBTC,
  ROPSTEN,
  BTC,
  ETH,
  ETH_DERIVATION_PATH,
  BTC_DERIVATION_PATH,
  TESTNET_DERIVATION_PATH,
  INFURA_KEY,
  XRP,
  TXRP
}
