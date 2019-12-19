const hdkey = require('ethereumjs-wallet/hdkey');
const bip39 = require('bip39');
const {axios} = require('../index');

const {
  TVET, VET_DERIVATION_PATH, TESTNET_DERIVATION_PATH,
} = require('../constants');

const generateWallet = (chain, mnemonic) => {
  const path = chain === TVET ? TESTNET_DERIVATION_PATH : VET_DERIVATION_PATH;
  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
  const derivePath = hdwallet.derivePath(path);
  return {xpub: derivePath.publicExtendedKey(), xpriv: derivePath.privateExtendedKey()};
};

const calculatePrivateKey = (chain, mnemonic, i) => {
  const path = chain === TVET ? TESTNET_DERIVATION_PATH : VET_DERIVATION_PATH;

  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
  const derivePath = hdwallet.derivePath(path).deriveChild(i);
  return derivePath.getWallet().getPrivateKeyString();
};

const blockchainTransaction = async (amount, to, privKey, fee, client, res, headers, data) => {
  const tx = {
    from: client.eth.accounts.wallet[0].address,
    to: to.trim(),
    data: data ? client.utils.toHex(data) : undefined,
    value: client.utils.toWei(`${amount}`, 'ether'),
  };

  if (fee) {
    tx.gas = fee.gasLimit;
  } else {
    try {
      tx.gas = await estimateGas(tx, res, headers);
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: 'Unable to calculate gas limit for transaction.',
        code: 'vet.transaction.gas',
      });
      throw e;
    }
  }
  const rawTransaction = (await client.eth.accounts.signTransaction(tx, privKey)).rawTransaction;
  if (!rawTransaction) {
    res.status(500).json({
      error: 'Unable to calculate transaction hash.',
      code: 'vet.transaction.hash',
    });
    throw new Error();
  }
  return rawTransaction;
};

const estimateGas = async (data, res, headers) => {
  try {
    const response = await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `vet/v2/transaction/gas`,
      data,
    });
    return response.data;
  } catch (e) {
    console.error(e.response);
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

module.exports = {
  generateWallet,
  calculatePrivateKey,
  blockchainTransaction,
  estimateGas,
};
