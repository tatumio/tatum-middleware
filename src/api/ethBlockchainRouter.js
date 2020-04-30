const express = require('express');
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const {broadcastEth} = require('../service/coreService');

const tokenABI = require('../contracts/token_abi');
const tokenByteCode = require('../contracts/token_bytecode');
const erc721ABI = require('../contracts/erc721/erc721_abi');
const erc721ByteCode = require('../contracts/erc721/erc721_bytecode');
const commonService = require('../service/commonService');
const ethService = require('../service/ethService');

const router = express.Router();

const {
  INFURA_KEY, ETH, ROPSTEN, CONTRACT_ADDRESSES, CONTRACT_DECIMALS,
} = require('../constants');

const chain = process.env.MODE === 'MAINNET' ? ETH : ROPSTEN;

router.get('/wallet', (req, res) => {
  const mnemonic = commonService.generateMnemonic(req.query.mnemonic);
  const wallet = ethService.generateWallet(chain, mnemonic);
  res.json({mnemonic, ...wallet});
});

router.post('/wallet/priv', ({body}, res) => {
  const {index, mnemonic} = body;
  const i = parseInt(index);
  const key = ethService.calculatePrivateKey(chain, mnemonic, i);
  res.json({key});
});

router.post('/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    currency,
    fee,
    nonce,
    data,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await ethService.getGasPriceInWei(res);

  let tx;
  if (currency === 'ETH') {
    tx = {
      from: 0,
      to: to.trim(),
      value: web3.utils.toWei(amount, 'ether'),
      gasPrice,
      data: data ? web3.utils.toHex(data) : undefined,
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
      data: contract.methods.transfer(to.trim(), new BigNumber(amount).multipliedBy(10).pow(CONTRACT_DECIMALS[currency]).toString(16)).encodeABI(),
      gasPrice,
      nonce,
    };
  }

  await ethService.blockchainTransaction(fee, tx, fromPrivateKey, web3, res, headers);
});

router.post('/erc20/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    amount,
    fee,
    digits,
    contractAddress,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await ethService.getGasPriceInWei(res);
  const contract = new web3.eth.Contract(tokenABI, contractAddress);

  const tx = {
    from: 0,
    to: contractAddress.trim(),
    data: contract.methods.transfer(to.trim(), `0x${new BigNumber(amount).multipliedBy(new BigNumber(10).pow(digits)).toString(16)}`).encodeABI(),
    gasPrice,
    nonce,
  };

  await ethService.blockchainTransaction(fee, tx, fromPrivateKey, web3, res, headers);
});

router.post('/erc20/deploy', async ({body, headers}, res) => {
  const {
    name,
    address,
    symbol,
    supply,
    digits,
    fromPrivateKey,
    fee,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await ethService.getGasPriceInWei(res);

  const contract = new web3.eth.Contract(tokenABI, null, {
    data: tokenByteCode,
  });
  const deploy = contract.deploy({
    arguments: [
      name,
      symbol,
      address,
      digits,
      `0x${new BigNumber(supply).multipliedBy(new BigNumber(10).pow(digits)).toString(16)}`,
      `0x${new BigNumber(supply).multipliedBy(new BigNumber(10).pow(digits)).toString(16)}`,
    ],
  });

  let gasLimit;
  try {
    gasLimit = fee ? fee.gasLimit : await web3.eth.estimateGas({
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
    }, fromPrivateKey);
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
});

router.post('/erc721/deploy', async ({body, headers}, res) => {
  const {
    name,
    symbol,
    fromPrivateKey,
    fee,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const gasPrice = fee ? web3.utils.toWei(fee.gasPrice, 'gwei') : await ethService.getGasPriceInWei(res);

  const contract = new web3.eth.Contract(erc721ABI, null, {
    data: erc721ByteCode,
  });
  const deploy = contract.deploy({arguments: [name, symbol]});

  let gasLimit;
  try {
    gasLimit = fee ? fee.gasLimit : await web3.eth.estimateGas({
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
    }, fromPrivateKey);
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
});

router.post('/erc721/transaction', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    tokenId,
    fee,
    contractAddress,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const contract = new web3.eth.Contract(erc721ABI, contractAddress);

  const txData = await ethService.erc721Transaction(web3, res, fromPrivateKey, contractAddress,
    contract.methods.safeTransferFrom(web3.eth.accounts.wallet[0].address, to.trim(), tokenId).encodeABI(),
    nonce, fee);

  try {
    await broadcastEth({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/mint', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    to,
    tokenId,
    url,
    fee,
    contractAddress,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const contract = new web3.eth.Contract(erc721ABI, contractAddress);

  const txData = await ethService.erc721Transaction(web3, res, fromPrivateKey, contractAddress,
    contract.methods.mintWithTokenURI(to.trim(), tokenId, url).encodeABI(), nonce, fee);

  try {
    await broadcastEth({txData}, res, headers);
  } catch (_) {
  }
});

router.post('/erc721/burn', async ({body, headers}, res) => {
  const {
    fromPrivateKey,
    tokenId,
    fee,
    contractAddress,
    nonce,
  } = body;

  const web3 = new Web3(`https://${chain}.infura.io/v3/${INFURA_KEY}`);
  web3.eth.accounts.wallet.clear();
  web3.eth.accounts.wallet.add(fromPrivateKey);
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

  const contract = new web3.eth.Contract(erc721ABI, contractAddress);

  const txData = await ethService.erc721Transaction(web3, res, fromPrivateKey, contractAddress,
    contract.methods.burn(tokenId).encodeABI(), nonce, fee);

  try {
    await broadcastEth({txData}, res, headers);
  } catch (_) {
  }
});

module.exports = router;
