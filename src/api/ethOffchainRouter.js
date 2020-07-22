const express = require('express');
const axios = require('axios');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {
  cancelWithdrawal, storeWithdrawal, broadcast, deployErc20, broadcastEth, getAccountById,
  getVirtualCurrencyByName,
} = require('../service/coreService');

const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const ethService = require('../service/ethService');

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const router = express.Router();
const chain = process.env.MODE === 'MAINNET' ? ETH : ROPSTEN;

const getGasPriceInWei = async (res) => {
  try {
    const {data} = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    return Web3.utils.toWei(new BigNumber(data.fast).dividedBy(10).toString(), 'gwei');
  } catch (e) {
    console.error(e);
    res.status(403).send({statusCode: 403, errorCode: 'gas.price.failed', message: 'Unable to estimate gas price.'});
    throw e;
  }
};

router.post('/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, privateKey, nonce, data, fee, ...withdrawal
  } = body;
  const {amount, address} = withdrawal;

  let fromPriv;
  if (mnemonic && index !== undefined) {
    const i = parseInt(index);
    fromPriv = mnemonic && index ? ethService.calculatePrivateKey(chain, mnemonic, i) : privateKey;
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({
      message: 'Either mnemonic or private key must be present.',
      statusCode: 400,
      errorCode: 'private.mnemonic.missing'
    });
    return;
  }

  let senderAccount;
  try {
    senderAccount = await getAccountById(withdrawal.senderAccountId, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei(res);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.senderBlockchainAddress = web3.eth.accounts.wallet[0].address;
  let tx;
  if (senderAccount.currency === 'ETH') {
    tx = {
      from: 0,
      to: address.trim(),
      value: web3.utils.toWei(amount, 'ether'),
      gasPrice,
      data: data ? web3.utils.toHex(data) : undefined,
      nonce,
    };
  } else {
    if (!Object.keys(CONTRACT_ADDRESSES).includes(senderAccount.currency)) {
      res.status(400).json({
        message: 'Unsupported ETH ERC20 blockchain.',
        statusCode: 400,
        errorCode: 'eth.erc20.unsupported',
      });
      return;
    }
    const contract = new web3.eth.Contract(tokenABI, CONTRACT_ADDRESSES[senderAccount.currency]);

    tx = {
      from: 0,
      to: CONTRACT_ADDRESSES[senderAccount.currency],
      data: contract.methods.transfer(address.trim(), new BigNumber(amount).multipliedBy(10).pow(CONTRACT_DECIMALS[senderAccount.currency]).toString(16)).encodeABI(),
      gasPrice,
      nonce,
    };
  }

  let gasLimit;
  try {
    gasLimit = fee ? fee.gasLimit : await web3.eth.estimateGas(tx);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to calculate gas limit for transaction',
      statusCode: 403,
      errorCode: 'eth.transaction.gas',
    });
    return;
  }
  tx.gas = gasLimit;
  withdrawal.fee = new BigNumber(web3.utils.fromWei(new BigNumber(gasLimit).multipliedBy(gasPrice).toString(), 'ether')).toString();

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to sign transaction',
      statusCode: 403,
      errorCode: 'eth.transaction.gas',
    });
    return;
  }

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  let r;
  try {
    await broadcast({
      txData: txData.rawTransaction,
      withdrawalId: id,
      currency: 'ETH',
    }, id, res, headers);
    return;
  } catch (err) {
    r = err.response;
  }

  try {
    await cancelWithdrawal(id, res, headers, 'true', r);
  } catch (_) {
  }
});

router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {
    mnemonic, index, privateKey, nonce, ...erc20
  } = body;

  let fromPriv;
  if (mnemonic && index !== undefined) {
    const i = parseInt(index);
    fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i);
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({
      message: 'Either mnemonic or private key must be present.',
      statusCode: 400,
      errorCode: 'private.mnemonic.missing'
    });
    return;
  }
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  erc20.chain = 'ETH';
  const gasPrice = await getGasPriceInWei(res);

  let response;
  try {
    response = await deployErc20(erc20, res, headers);
  } catch (e) {
    return;
  }

  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode,
  });
  const deploy = contract.deploy({
    arguments: [
      erc20.symbol,
      erc20.symbol,
      response.data.address,
      18,
      `0x${new BigNumber(erc20.supply).multipliedBy(new BigNumber(10).pow(18)).toString(16)}`,
      `0x${new BigNumber(erc20.supply).multipliedBy(new BigNumber(10).pow(18)).toString(16)}`,
    ],
  });

  let gasLimit;
  try {
    gasLimit = await web3.eth.estimateGas({
      from: 0,
      data: deploy.encodeABI(),
    });
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to calculate gas limit for transaction',
      statusCode: 403,
      errorCode: 'eth.transaction.gas',
    });
    return;
  }

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction({
      from: 0,
      gas: gasLimit,
      gasPrice,
      data: deploy.encodeABI(),
      nonce,
    }, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to sign transaction for contract creation.',
      statusCode: 403,
      errorCode: 'eth.erc20.sign',
    });
    return;
  }

  try {
    const r = await broadcastEth({
      txData: txData.rawTransaction,
    }, res, headers, false);
    res.status(200).json({txId: r.txId, id: response.data.accountId});
  } catch (_) {
  }
});

router.post('/erc20/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, privateKey, nonce, fee, ...withdrawal
  } = body;
  const {amount, address} = withdrawal;

  let fromPriv;
  if (mnemonic && index !== undefined) {
    const i = parseInt(index);
    fromPriv = mnemonic && index ? ethService.calculatePrivateKey(chain, mnemonic, i) : privateKey;
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({
      message: 'Either mnemonic or private key must be present.',
      statusCode: 400,
      errorCode: 'private.mnemonic.missing'
    });
    return;
  }
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.senderBlockchainAddress = web3.eth.accounts.wallet[0].address;

  let senderAccount;
  try {
    senderAccount = await getAccountById(withdrawal.senderAccountId, headers);
  } catch (e) {
    console.error(e);
    return res.status(e.response.status).json(e.response.data);
  }

  let erc20Address = '';
  let erc20Decimals = 18;
  switch (senderAccount.currency) {
    case 'USDT':
    case 'LEO':
    case 'LINK':
    case 'FREE':
    case 'MKR':
    case 'USDC':
    case 'BAT':
    case 'TUSD':
    case 'PAX':
    case 'PAXG':
    case 'PLTC':
    case 'MMY':
    case 'XCON':
      erc20Address = CONTRACT_ADDRESSES[senderAccount.currency];
      erc20Decimals = CONTRACT_DECIMALS[senderAccount.currency];
      break;
    default:
      try {
        const vc = await getVirtualCurrencyByName(senderAccount.currency, headers);
        erc20Address = vc.erc20Address;
      } catch (e) {
        console.error(e);
        return res.status(e.response.status).json(e.response.data);
      }
  }

  const contract = new web3.eth.Contract(tokenABI, erc20Address);
  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await getGasPriceInWei(res);

  const tx = {
    from: 0,
    to: erc20Address.trim(),
    data: contract.methods.transfer(address.trim(), `0x${new BigNumber(amount).multipliedBy(new BigNumber(10).pow(erc20Decimals)).toString(16)}`).encodeABI(),
    gasPrice,
    nonce,
  };

  let gasLimit;
  try {
    gasLimit = fee ? fee.gasLimit : await web3.eth.estimateGas(tx);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to calculate gas limit for transaction',
      statusCode: 403,
      errorCode: 'eth.transaction.gas',
    });
    return;
  }
  tx.gas = gasLimit;
  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(403).json({
      message: 'Unable to sign transaction',
      statusCode: 403,
      errorCode: 'eth.transaction.sign',
    });
    return;
  }
  withdrawal.fee = new BigNumber(web3.utils.fromWei(new BigNumber(gasLimit).multipliedBy(gasPrice).toString(), 'ether')).toString();
  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }
  const {id} = resp.data;

  let r;
  try {
    await broadcast({
      txData: txData.rawTransaction,
      withdrawalId: id,
      currency: 'ETH',
    }, id, res, headers);
    return;
  } catch (err) {
    r = err.response;
  }

  try {
    await cancelWithdrawal(id, res, headers, 'false', r);
  } catch (_) {
  }
});

module.exports = router;
