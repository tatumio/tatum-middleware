const Transaction = require('@binance-chain/javascript-sdk/lib/tx').default;
const BigNumber = require('bignumber.js');
const {
  decodeAddress, generatePrivateKey, getAddressFromPrivateKey,
} = require('@binance-chain/javascript-sdk/lib/crypto');
const {getBnbAccount} = require('../service/coreService');

const {
  TBNB,
} = require('../constants');

const generateWallet = (chain) => {
  const privateKey = generatePrivateKey();
  const prefix = chain === TBNB ? 'tbnb' : 'bnb';
  return {
    address: getAddressFromPrivateKey(privateKey, prefix),
    privateKey,
  };
};

const calculateAddressFromPrivateKey = (chain, privateKey) => getAddressFromPrivateKey(privateKey, chain.toLowerCase());

const prepareTransaction = async (chain, addressFrom, res, to, currency, amount, message = '', fromPrivateKey, headers) => {
  let account;
  let toAccCode;
  try {
    account = await getBnbAccount(addressFrom, res, headers);
  } catch (e) {
    console.error(e);
    res.status(403).json({message: 'Unable to get BNB account.', statusCode: 403, errorCode: 'bnb.account.not.exists'});
    return;
  }

  const accCode = decodeAddress(addressFrom);
  try {
    toAccCode = decodeAddress(to);
  } catch (e) {
    console.error(e);
    res.status(403).json({message: 'Unable to decode target address.', statusCode: 403, errorCode: 'bnb.to.mismatch'});
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
    res.status(403).json({
      message: 'Unable to sing transaction.',
      statusCode: 403,
      errorCode: 'bnb.transaction.invalid.body',
    });
    throw e;
  }
};

module.exports = {
  generateWallet,
  calculateAddressFromPrivateKey,
  prepareTransaction,
};
