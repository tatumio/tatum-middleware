const TBTC = 'TBTC';
const VET = 'VET';
const TVET = 'TVET';
const ROPSTEN = 'ropsten';
const TLTC = 'TLTC';
const LTC = 'LTC';
const BCH = 'BCH';
const TBCH = 'TBCH';
const BTC = 'BTC';
const BSV = 'BSV';
const TBSV = 'TBSV';
const BNB = 'BNB';
const TBNB = 'TBNB';
const ETH = 'mainnet';
const XRP = 'XRP';
const XLM = 'XLM';
const ETH_DERIVATION_PATH = 'm/44\'/60\'/0\'/0';
const VET_DERIVATION_PATH = 'm/44\'/818\'/0\'/0';
const BTC_DERIVATION_PATH = 'm/44\'/0\'/0\'/0';
const BCH_DERIVATION_PATH = 'm/44\'/145\'/0\'/0';
const BSV_DERIVATION_PATH = 'm/44\'/236\'/0\'/0';
const LTC_DERIVATION_PATH = 'm/44\'/2\'/0\'/0';
const BNB_DERIVATION_PATH = 'm/44\'/714\'/0\'/0';
const TESTNET_DERIVATION_PATH = 'm/44\'/1\'/0\'/0';

const INFURA_KEY = process.env.INFURA_KEY || '0d81f0f1a8274699be73135db15af8a3';

const LTC_NETWORK_TESTNET = {
  messagePrefix: '\x18Litecoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x0436f6e1,
    private: 0x0436ef7d,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0x3a,
  wif: 0xef,
};

const LTC_NETWORK_MAINNET = {
  messagePrefix: '\x18Litecoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

const CONTRACT_ADDRESSES = {
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  LEO: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3',
  LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
  FREE: '0x2f141ce366a2462f02cea3d12cf93e4dca49e4fd',
  MKR: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  BAT: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
  TUSD: '0x0000000000085d4780B73119b644AE5ecd22b376',
  PAX: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
  PAXG: '0x45804880de22913dafe09f4980848ece6ecbaf78',
  PLTC: '0x429d83bb0dcb8cdd5311e34680adc8b12070a07f',
  MMY: '0x385ddf50c3de724f6b8ecb41745c29f9dd3c6d75',
  XCON: '0x0f237d5ea7876e0e2906034d98fdb20d43666ad4',
};

const CONTRACT_DECIMALS = {
  USDT: 6,
  LEO: 18,
  LINK: 18,
  FREE: 18,
  MKR: 18,
  USDC: 6,
  BAT: 18,
  TUSD: 18,
  PAX: 18,
  PAXG: 18,
  PLTC: 18,
  MMY: 18,
  XCON: 18,
};

const BSV_NETWORK_MAINNET = {
  messagePrefix: 'mainnet',
  bech32: '',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  wif: 0x80,
  scriptHash: 0x05,
};

const BSV_NETWORK_TESTNET = {
  messagePrefix: 'mainnet',
  bech32: '',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  wif: 0xef,
  scriptHash: 0xc4,
};

module.exports = {
  TBTC,
  ROPSTEN,
  BTC,
  ETH,
  BNB,
  TBNB,
  ETH_DERIVATION_PATH,
  BNB_DERIVATION_PATH,
  BTC_DERIVATION_PATH,
  BCH_DERIVATION_PATH,
  LTC_DERIVATION_PATH,
  VET_DERIVATION_PATH,
  BSV_DERIVATION_PATH,
  LTC,
  TLTC,
  TESTNET_DERIVATION_PATH,
  INFURA_KEY,
  XRP,
  XLM,
  VET,
  TVET,
  BCH,
  TBCH,
  BSV,
  TBSV,
  CONTRACT_ADDRESSES,
  CONTRACT_DECIMALS,
  LTC_NETWORK_MAINNET,
  LTC_NETWORK_TESTNET,
  BSV_NETWORK_MAINNET,
  BSV_NETWORK_TESTNET,
};
