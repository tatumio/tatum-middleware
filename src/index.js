const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const {generateJwt} = require('./service/commonService');

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  if (process.env.JWT_KEY && process.env.JWT_SECRET) {
    config.headers.authorization = `Bearer ${generateJwt(process.env.JWT_KEY, process.env.JWT_SECRET)}`;
  }
  return config;
});

module.exports = {
  axios: axiosInstance,
};

const ethBlockchainRouter = require('./api/ethBlockchainRouter');
const ethOffchainRouter = require('./api/ethOffchainRouter');
const btcBlockchainRouter = require('./api/btcBlockchainRouter');
const btcOffchainRouter = require('./api/btcOffchainRouter');
const xrpBlockchainRouter = require('./api/xrpBlockchainRouter');
const xrpOffchainRouter = require('./api/xrpOffchainRouter');
const jwtRouter = require('./api/jwtRouter');
const qrCodeRouter = require('./api/qrCodeRouter');

const serverPort = 6543;

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/ethereum/v2', ethBlockchainRouter);
app.use('/offchain/v2/ethereum', ethOffchainRouter);
app.use('/bitcoin/v2', btcBlockchainRouter);
app.use('/offchain/v2/bitcoin', btcOffchainRouter);
app.use('/xrp/v2', xrpBlockchainRouter);
app.use('/offchain/v2/xrp', xrpOffchainRouter);

app.use('/util/v2/apiKey', jwtRouter);
app.use('/util/v2/qr', qrCodeRouter);

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
        authorization: headers.authorization,
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
