const {fromBase58, fromSeed} = require('bip32');
const Transaction = require('@binance-chain/javascript-sdk/lib/tx').default;
const {networks} = require('bitcoinjs-lib');
const BigNumber = require('bignumber.js');
const {mnemonicToSeed} = require('bip39');
const {
  decodeAddress, getAddressFromPublicKey, getAddressFromPrivateKey, getPrivateKeyFromMnemonic,
} = require('@binance-chain/javascript-sdk/lib/crypto');
const {getBnbAccount} = require('../service/coreService');

const {
  TBNB, BNB_DERIVATION_PATH,
} = require('../constants');

const generateWallet = (chain, mnemonic) => {
  const hdwallet = fromSeed(mnemonicToSeed(mnemonic), chain === TBNB ? networks.testnet : undefined);
  const derivePath = hdwallet.derivePath(BNB_DERIVATION_PATH);
  return {
    xpub: derivePath.neutered().toBase58(),
    xpriv: derivePath.privateKey.toString('hex'),
    mnemonic,
  };
};

const calculateAddress = (xpub, chain, index) => {
  const w = fromBase58(xpub, chain === TBNB ? networks.testnet : undefined).derive(index);
  return getAddressFromPublicKey(w.publicKey.toString('hex'), chain.toLowerCase());
};

const calculateAddressFromPrivateKey = (chain, privateKey) => getAddressFromPrivateKey(privateKey, chain.toLowerCase());

const calculatePrivateKey = (chain, mnemonic, i) => ({key: getPrivateKeyFromMnemonic(mnemonic, true, i)});

const prepareTransaction = async (chain, addressFrom, res, to, currency, amount, message = '', fromPrivateKey, headers) => {
  let account;
  let toAccCode;
  try {
    account = await getBnbAccount(addressFrom, res, headers);
  } catch (e) {
    console.error(e);
    res.status(400).json({error: 'Unable to get BNB account.', code: 'bnb.account.not.exists'});
    return;
  }

  const accCode = decodeAddress(addressFrom);
  try {
    toAccCode = decodeAddress(to);
  } catch (e) {
    console.error(e);
    res.status(400).json({error: 'Unable to decode target address.', code: 'bnb.to.mismatch'});
    return;
  }

  const coin = {
    denom: currency,
    amount: new BigNumber(amount).multipliedBy(10 ** 8).toNumber(),
  };

  const msg = {
    inputs: [{
      address: accCode,
      coins: [coin],
    }],
    outputs: [{
      address: toAccCode,
      coins: [coin],
    }],
    msgType: Transaction.TxTypes.MsgSend,
  };

  const signMsg = {
    inputs: [{
      address: addressFrom,
      coins: [coin],
    }],
    outputs: [{
      address: to,
      coins: [coin],
    }],
  };

  const options = {
    account_number: parseInt(account.account_number),
    chain_id: chain === TBNB ? 'Binance-Chain-Nile' : 'Binance-Chain-Tigris',
    memo: message,
    msg,
    sequence: parseInt(account.sequence),
    source: 0,
    type: msg.msgType,
  };

  const tx = new Transaction(options);
  try {
    return tx.sign(fromPrivateKey, signMsg).serialize();
  } catch (e) {
    console.error(e);
    res.status(400).json({error: 'Unable to sing transaction.', code: 'bnb.transaction.invalid.body'});
    throw e;
  }
};

module.exports = {
  generateWallet,
  calculateAddress,
  calculatePrivateKey,
  calculateAddressFromPrivateKey,
  prepareTransaction,
};
