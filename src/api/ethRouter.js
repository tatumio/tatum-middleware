const express = require('express');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {
  cancelWithdrawal, storeWithdrawal, broadcast, deployErc20, broadcastEth,
} = require('../service/coreService');

const router = express.Router();
const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const commonService = require('../service/commonService');
const ethService = require('../service/ethService');

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const chain = process.env.API_URL.includes('api-') ? ETH : ROPSTEN;

router.get('/wallet', (_, res) => {
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
  const key = ethService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, privateKey, ...withdrawal
  } = body;
  const {amount, address, currency} = withdrawal;

  let fromPriv;
  if (mnemonic && index) {
    const i = parseInt(index);
    fromPriv = mnemonic && index ? ethService.calculatePrivateKey(chain, mnemonic, i) : privateKey;
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({error: 'Either mnemonic or private key must be present.', code: 'private.mnemonic.missing'});
    return;
  }

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.senderBlockchainAddress = web3.eth.accounts.wallet[0].address;

  let tx;
  if (currency === 'ETH') {
    tx = {
      from: 0,
      to: address.trim(),
      value: web3.utils.toWei(`${amount}`, 'ether'),
      gasPrice: web3.utils.toWei('10', 'gwei'),
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
      data: contract.methods.transfer(address.trim(), new BigNumber(amount).multipliedBy(10).pow(CONTRACT_DECIMALS[currency]).toString(16)).encodeABI(),
      gasPrice: web3.utils.toWei('10', 'gwei'),
    };
  }

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
  withdrawal.amount = new BigNumber(amount).toNumber();
  withdrawal.fee = new BigNumber(web3.utils.fromWei(`${gasLimit}`, 'ether')).toNumber();

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
      txData: txData.rawTransaction,
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

router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {
    mnemonic, payIndex, privateKey, ...erc20
  } = body;

  let fromPriv;
  if (mnemonic && payIndex) {
    const i = parseInt(payIndex);
    fromPriv = mnemonic && payIndex ? ethService.calculatePrivateKey(chain, mnemonic, i) : privateKey;
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({error: 'Either mnemonic or private key must be present.', code: 'private.mnemonic.missing'});
    return;
  }
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  erc20.chain = 'ETH';
  if (mnemonic) {
    erc20.xpub = ethService.generateWallet(chain, mnemonic).xpub;
  }

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
      erc20.name,
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
      gasPrice: web3.utils.toWei('10', 'gwei'),
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

  try {
    await broadcastEth({
      txData: txData.rawTransaction,
    }, res, headers);
  } catch (_) {
  }
  // When we want to wait for contract creation, we can use this method - with gas big enough, it will be processed quickly

  // const {name} = erc20;
  // web3.eth.sendSignedTransaction(txData.rawTransaction)
  //   .once('receipt', async (receipt) => {
  //     try {
  //       await storeErc20Address(name, receipt.contractAddress, {
  //         transactionHash: receipt.transactionHash,
  //         contractAddress: receipt.contractAddress,
  //         ...response.data,
  //       }, res, headers);
  //     } catch (_) {
  //     }
  //   })
  //   .on('error', e => res.status(400).json({
  //     code: 'ethereum.erc20.broadcast.failed',
  //     message: `Unable to broadcast transaction due to ${e.message}`,
  //   }));
});

router.post('/erc20/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, tokenAddress, privateKey, ...withdrawal
  } = body;
  const {amount, address, currency} = withdrawal;

  let fromPriv;
  if (mnemonic && index) {
    const i = parseInt(index);
    fromPriv = mnemonic && index ? ethService.calculatePrivateKey(chain, mnemonic, i) : privateKey;
  } else if (privateKey) {
    fromPriv = privateKey;
  } else {
    res.status(400).json({error: 'Either mnemonic or private key must be present.', code: 'private.mnemonic.missing'});
    return;
  }
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.senderBlockchainAddress = web3.eth.accounts.wallet[0].address;
  const contract = new web3.eth.Contract(tokenABI, tokenAddress);

  const tx = {
    from: 0,
    to: tokenAddress.trim(),
    data: contract.methods.transfer(address.trim(), `0x${new BigNumber(amount).multipliedBy(new BigNumber(10).pow(18)).toString(16)}`).encodeABI(),
    gasPrice: web3.utils.toWei('10', 'gwei'),
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
  withdrawal.fee = new BigNumber(web3.utils.fromWei(`${tx.gasLimit}`, 'ether')).toNumber();
  let resp;
  try {
    resp = await storeWithdrawal(withdrawal, res, headers);
  } catch (_) {
    return;
  }
  const {id} = resp.data;

  try {
    await broadcast({
      txData: txData.rawTransaction,
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
