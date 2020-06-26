const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
});

module.exports = {
  axios: axiosInstance,
};

const vetBlockchainRouter = require('./api/vetBlockchainRouter');
const ethBlockchainRouter = require('./api/ethBlockchainRouter');
const ethOffchainRouter = require('./api/ethOffchainRouter');
const bnbBlockchainRouter = require('./api/bnbBlockchainRouter');
const btcBlockchainRouter = require('./api/btcBlockchainRouter');
const btcOffchainRouter = require('./api/btcOffchainRouter');
const bcashBlockchainRouter = require('./api/bcashBlockchainRouter');
const bcashOffchainRouter = require('./api/bcashOffchainRouter');
const ltcBlockchainRouter = require('./api/ltcBlockchainRouter');
const ltcOffchainRouter = require('./api/ltcOffchainRouter');
const xlmBlockchainRouter = require('./api/xlmBlockchainRouter');
const xlmOffchainRouter = require('./api/xlmOffchainRouter');
const neoBlockchainRouter = require('./api/neoBlockchainRouter');
const xrpBlockchainRouter = require('./api/xrpBlockchainRouter');
const xrpOffchainRouter = require('./api/xrpOffchainRouter');

const serverPort = 6543;

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/v3/bnb', bnbBlockchainRouter);
app.use('/v3/vet', vetBlockchainRouter);
app.use('/v3/ethereum', ethBlockchainRouter);
app.use('/v3/offchain/ethereum', ethOffchainRouter);
app.use('/v3/bcash', bcashBlockchainRouter);
app.use('/v3/offchain/bcash', bcashOffchainRouter);
app.use('/v3/bitcoin', btcBlockchainRouter);
app.use('/v3/offchain/bitcoin', btcOffchainRouter);
app.use('/v3/litecoin', ltcBlockchainRouter);
app.use('/v3/offchain/litecoin', ltcOffchainRouter);
app.use('/v3/xlm', xlmBlockchainRouter);
app.use('/v3/offchain/xlm', xlmOffchainRouter);
app.use('/v3/neo', neoBlockchainRouter);
app.use('/v3/xrp', xrpBlockchainRouter);
app.use('/v3/offchain/xrp', xrpOffchainRouter);

app.use(async ({
  url, method, headers, body: data,
}, res) => {
  // default handling of Tatum APIs
  try {
    const response = await axiosInstance({
      method,
      url,
      data,
      headers: {
        'content-type': headers['content-type'] || 'application/json',
        accept: 'application/json',
        'x-api-key': headers['x-api-key'],
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      console.error(error.response);
      res.status(error.response.status).send(error.response.data);
    } else {
      console.error(error);
      res.status(404).send(error.message);
    }
  }
});

app.listen(serverPort, () => console.log(`Tatum Middleware listening on port ${serverPort}!`));
