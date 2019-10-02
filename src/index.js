const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load(`${process.cwd()}/swagger.yaml`);

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/v2/blockchain/ethereum', ethBlockchainRouter);
app.use('/v2/offchain/ethereum', ethOffchainRouter);
app.use('/v2/blockchain/bitcoin', btcBlockchainRouter);
app.use('/v2/offchain/bitcoin', btcOffchainRouter);
app.use('/v2/blockchain/xrp', xrpBlockchainRouter);
app.use('/v2/offchain/xrp', xrpOffchainRouter);

app.use('/v2/apiKey', jwtRouter);
app.use('/v2/blockchain/qr', qrCodeRouter);

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
