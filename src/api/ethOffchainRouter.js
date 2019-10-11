const express = require('express');
const axios = require('axios');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {
  cancelWithdrawal, storeWithdrawal, broadcast, deployErc20, broadcastEth,
} = require('../service/coreService');

const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const ethService = require('../service/ethService');

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const router = express.Router();
const chain = process.env.API_URL.includes('api') ? ETH : ROPSTEN;

const getGasPriceInWei = async (res) => {
  try {
    const {data} = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    return Web3.utils.toWei(new BigNumber(data.fast).dividedBy(10).toString(), 'gwei');
  } catch (e) {
    console.error(e);
    res.status(500).send({code: 'gas.price.failed', message: 'Unable to estimate gas price.'});
    throw e;
  }
};

router.post('/transfer', async ({body, headers}, res) => {
  const {
    mnemonic, index, privateKey, nonce, ...withdrawal
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

  const gasPrice = await getGasPriceInWei(res);
  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPriv);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  withdrawal.senderBlockchainAddress = web3.eth.accounts.wallet[0].address;

  let tx;
  if (currency === 'ETH') {
    tx = {
      from: 0,
      to: address.trim(),
      value: web3.utils.toWei(amount, 'ether'),
      gasPrice,
      nonce,
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
      gasPrice,
      nonce,
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
  withdrawal.fee = new BigNumber(web3.utils.fromWei(new BigNumber(gasLimit).multipliedBy(gasPrice).toString(), 'ether')).toString();

  let txData;
  try {
    txData = await web3.eth.accounts.signTransaction(tx, fromPriv);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'Unable to sign transaction',
      code: 'eth.transaction.gas',
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
    mnemonic, payIndex, privateKey, nonce, ...erc20
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
      gasPrice,
      data: deploy.encodeABI(),
      nonce,
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
    mnemonic, index, tokenAddress, privateKey, nonce, ...withdrawal
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
  const gasPrice = await getGasPriceInWei(res);

  const tx = {
    from: 0,
    to: tokenAddress.trim(),
    data: contract.methods.transfer(address.trim(), `0x${new BigNumber(amount).multipliedBy(new BigNumber(10).pow(18)).toString(16)}`).encodeABI(),
    gasPrice,
    nonce,
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
  withdrawal.fee = new BigNumber(web3.utils.fromWei(new BigNumber(tx.gasLimit).multipliedBy(tx.gasPrice).toString(), 'ether')).toString();
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
