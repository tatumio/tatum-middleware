const BigNumber = require('bignumber.js');
const {axios} = require('../index');

const storeWithdrawal = async (data, res, headers) => {
  try {
    return await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/withdrawal`,
      data,
    });
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const getUTXOBtc = async (hash, index, headers) => {
  const response = await axios({
    method: 'GET',
    headers: {
      'content-type': headers['content-type'] || 'application/json',
      accept: 'application/json',
      'x-api-key': headers['x-api-key'],
    },
    url: `v3/bitcoin/utxo/${hash}/${index}`,
  });
  return response.data;
};

const getAccountById = async (index, headers) => {
  const response = await axios({
    method: 'GET',
    headers: {
      'content-type': headers['content-type'] || 'application/json',
      accept: 'application/json',
      'x-api-key': headers['x-api-key'],
    },
    url: `v3/ledger/account/${index}`,
  });
  return response.data;
};

const getVirtualCurrencyByName = async (name, headers) => {
  const response = await axios({
    method: 'GET',
    headers: {
      'content-type': headers['content-type'] || 'application/json',
      accept: 'application/json',
      'x-api-key': headers['x-api-key'],
    },
    url: `v3/ledger/virtualCurrency/${name}`,
  });
  return response.data;
};

const getUTXOLtc = async (hash, index, headers) => {
  const response = await axios({
    method: 'GET',
    headers: {
      'content-type': headers['content-type'] || 'application/json',
      accept: 'application/json',
      'x-api-key': headers['x-api-key'],
    },
    url: `v3/litecoin/utxo/${hash}/${index}`,
  });
  return response.data;
};

const getTxByAddressBtc = async (address, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/bitcoin/transaction/address/${address}?pageSize=50`,
    });
    return response.data;
  } catch (e) {
    return [];
  }
};

const getBchTx = async (hash, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/bcash/transaction/${hash}`,
    });
    return response.data;
  } catch (e) {
    return [];
  }
};

const getTxByAddressLtc = async (address, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/litecoin/transaction/address/${address}?pageSize=50`,
    });
    return response.data;
  } catch (e) {
    return [];
  }
};

const getBnbAccount = async (address, res, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/bnb/account/${address}`,
    });
    return response.data;
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const broadcastBlockchain = async (endpoint, data, res, headers, finish = true) => {
  try {
    const response = await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/${endpoint}/broadcast`,
      data,
    });
    if (finish) {
      res.status(200).json(response.data);
    } else {
      return response.data;
    }
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const broadcastBtc = async (data, res, headers) => broadcastBlockchain('bitcoin', data, res, headers);

const broadcastBch = async (data, res, headers) => broadcastBlockchain('bcash', data, res, headers);

const broadcastBsv = async (data, res, headers) => broadcastBlockchain('bsv', data, res, headers);

const broadcastLtc = async (data, res, headers) => broadcastBlockchain('litecoin', data, res, headers);

const broadcastEth = async (data, res, headers, finish = true) => broadcastBlockchain('ethereum', data, res, headers, finish);

const broadcastTron = async (data, res, headers, finish = true) => broadcastBlockchain('tron', data, res, headers, finish);

const broadcastVet = async (data, res, headers) => broadcastBlockchain('vet', data, res, headers);

const broadcastBnb = async (data, res, headers) => broadcastBlockchain('bnb', data, res, headers);

const broadcastXrp = async (data, res, headers) => broadcastBlockchain('xrp', data, res, headers);

const broadcastXlm = async (data, res, headers) => broadcastBlockchain('xlm', data, res, headers);

const getFeeXrp = async (res, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/xrp/fee`,
    });
    return new BigNumber(response.data.drops.base_fee).dividedBy(1000000).toString();
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const getAccountXrp = async (accountId, res, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/xrp/account/${accountId}`,
    });
    return response.data;
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const getAccountXlm = async (accountId, res, headers) => {
  try {
    const response = await axios({
      method: 'GET',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/xlm/account/${accountId}`,
    });
    return response.data;
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).send(e.response.data);
    throw e;
  }
};

const broadcast = async (data, id, res, headers) => {
  try {
    const response = await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/withdrawal/broadcast`,
      data,
    });
    if (response.data.completed) {
      return res.json({...response.data, id});
    }
    res.status(200).json({
      id,
      ...response.data,
      message: 'Withdrawal submitted to blockchain but not completed, wait until it is completed automatically in next block or complete it manually.',
      statusCode: 200,
      errorCode: 'withdrawal.not.completed',
    });
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    throw e;
  }
};

const storeErc20Address = async (symbol, address, responseData, res, headers) => {
  try {
    await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/ethereum/erc20/${symbol}/${address}`,
    });
    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(error.response.status).json({
      ...responseData,
      message: 'Unable to set contract address for ERC20 symbol to Tatum, manual update is necessary.',
      statusCode: error.response.status,
      errorCode: 'erc20.not.completed',
    });
    throw error;
  }
};

const registerErc20 = async (data, res, headers) => {
  try {
    return await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/ethereum/erc20/`,
      data,
    });
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).json(e.response.data);
    throw e;
  }
};

const registerTrc = async (data, res, headers) => {
  try {
    return await axios({
      method: 'POST',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/tron/trc`,
      data,
    });
  } catch (e) {
    console.error(JSON.stringify(e.response.data));
    res.status(e.response.status).json(e.response.data);
    throw e;
  }
};

const cancelWithdrawal = async (id, res, headers, revert = 'true', response) => {
  try {
    await axios({
      method: 'DELETE',
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
      url: `v3/offchain/withdrawal/${id}?revert=${revert}`,
    });
    if (response) {
      return res.status(response.status).json(response.data);
    }
    res.status(403).json({
      statusCode: 403,
      message: 'Unable to broadcast transaction, withdrawal cancelled.',
      errorCode: 'withdrawal.hex.cancelled',
    });
  } catch (err) {
    console.error(err.response.data);
    res.status(err.response.status).json(err.response.data);
    throw err;
  }
};

module.exports = {
  storeWithdrawal,
  broadcast,
  getVirtualCurrencyByName,
  broadcastBtc,
  broadcastLtc,
  broadcastEth,
  broadcastXrp,
  broadcastXlm,
  broadcastVet,
  broadcastBnb,
  broadcastBch,
  broadcastBsv,
  broadcastTron,
  getFeeXrp,
  getBchTx,
  getAccountXrp,
  getAccountXlm,
  getBnbAccount,
  getAccountById,
  cancelWithdrawal,
  registerErc20,
  registerTrc,
  getUTXOLtc,
  getUTXOBtc,
  getTxByAddressBtc,
  getTxByAddressLtc,
  storeErc20Address,
};
