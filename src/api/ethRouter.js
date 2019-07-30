const express = require('express');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {
  cancelWithdrawal, storeWithdrawal, broadcast, deployErc20, broadcastErc20, storeErc20Address,
} = require('../service/coreService');

const router = express.Router();
const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const commonService = require('../service/commonService');
const ethService = require('../service/ethService');

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const chain = process.env.API_URL.endsWith('main') ? ETH : ROPSTEN;

router.post('/wallet', (_, res) => {
  const mnemonic = commonService.generateMnemonic();
  const wallet = ethService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.get('/wallet/xpub/:pub/:i', ({params}, res) => {
  const {i, pub} = params;
  const address = ethService.calculateAddress(pub, i);
  res.send({address});
});

router.post('/wallet/xpriv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  const privateKey = ethService.calculatePrivateKey(chain, mnemonic, i);
  res.json({privateKey});
});

router.post('/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, ...withdrawal
  } = body;
  const {amount, targetAddress, currency} = withdrawal;

  const i = parseInt(index);
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i);
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.sourceAddress = web3.eth.accounts.wallet[0].address;

  let tx;
  if (currency === 'ETH') {
    tx = {
      from: 0,
      to: targetAddress.trim(),
      value: amount,
      gasPrice: web3.utils.toWei('1', 'wei'),
    };
  } else {
    if (!Object.keys(CONTRACT_ADDRESSES).includes(currency)) {
      res.status(400).json({
        error: 'Unsupported ETH ERC20 blockchain.',
        code: 'eth.erc20.unsupported',
      });
      return;
    }
    const contract = new web3.eth.Contract(tokenABI, CONTRACT_ADDRESSES[currency]);

    tx = {
      from: 0,
      to: CONTRACT_ADDRESSES[currency],
      data: contract.methods.transfer(targetAddress.trim(), new BigNumber(amount).multipliedBy(10).pow(CONTRACT_DECIMALS[currency]).toString(16)).encodeABI(),
      gasPrice: web3.utils.toWei('1', 'wei'),
    };
  }

  let gasLimit;
  try {
    gasLimit = await web3.eth.estimateGas(tx);
  } catch (e) {
    res.status(500).json({
      error: 'Unable to calculate gas limit for transaction',
      code: 'eth.transaction.gas',
    });
    return;
  }
  tx.gasLimit = gasLimit;
  withdrawal.amount = web3.utils.fromWei(`${amount}`, 'ether');
  withdrawal.fee = web3.utils.fromWei(`${gasLimit}`, 'ether');

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    return;
  }

  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }

  const {id} = resp.data;
  try {
    await broadcast({
      txData,
      withdrawalId: id,
      currency,
    }, id, res, headers);
  } catch (_) {
  }

  try {
    await cancelWithdrawal(id, res, headers);
  } catch (_) {
  }
});

router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {
    mnemonic, payIndex, ...erc20
  } = body;
  const {symbol} = erc20;

  const i = parseInt(payIndex);
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i);
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  erc20.chain = 'ETH';
  erc20.xpub = ethService.generateWallet(chain, mnemonic).xpub;

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
      erc20.name,
      erc20.symbol,
      response.address,
      18,
      erc20.supply,
      erc20.supply,
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
    res.status(500).json({
      error: 'Unable to calculate gas limit for transaction',
      code: 'eth.transaction.gas',
    });
    return;
  }

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction({
      from: 0,
      gasLimit,
      gasPrice: web3.utils.toWei('1', 'wei'),
      data: deploy.encodeABI(),
    }, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to sign transaction for contract creation.',
      code: 'eth.erc20.sign',
    });
    return;
  }

  let data;
  try {
    data = (await broadcastErc20({
      txData,
      currency: 'ETH',
    }, res, headers)).data;
  } catch (error) {
    return;
  }
  try {
    await storeErc20Address(symbol, data.contractAddress, {
      ...data,
      ...response.data,
    }, res, headers);
  } catch (_) {
  }
});

router.post('/erc20/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, tokenAddress, ...withdrawal
  } = body;
  const {amount, targetAddress, currency} = withdrawal;

  const i = parseInt(index);
  const fromPriv = ethService.calculatePrivateKey(chain, mnemonic, i);
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.sourceAddress = web3.eth.accounts.wallet[0].address;
  const contract = new web3.eth.Contract(tokenABI, tokenAddress);

  const tx = {
    from: 0,
    to: tokenAddress.trim(),
    data: contract.methods.transfer(targetAddress.trim(), new BigNumber(amount).multipliedBy(10).pow(18).toString(16)).encodeABI(),
    gasPrice: web3.utils.toWei('1', 'wei'),
  };

  let gasLimit;
  try {
    gasLimit = await web3.eth.estimateGas(tx);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to calculate gas limit for transaction',
      code: 'eth.transaction.gas',
    });
    return;
  }
  tx.gasLimit = gasLimit;
  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to sign transaction',
      code: 'eth.transaction.sign',
    });
    return;
  }
  withdrawal.fee = web3.utils.fromWei(`${tx.gasLimit}`, 'ether');
  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }
  const {id} = resp.data;

  try {
    await broadcast({
      txData,
      withdrawalId: id,
      currency,
    }, id, res, headers);
    return;
  } catch (_) {
  }

  try {
    await cancelWithdrawal(id, res, headers);
  } catch (_) {
  }
});

module.exports = router;
