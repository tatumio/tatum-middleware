const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
});

module.exports = {
  axios: axiosInstance,
};

const ethRouter = require('./api/ethRouter');
const btcRouter = require('./api/btcRouter');
const xrpRouter = require('./api/xrpRouter');
const jwtRouter = require('./api/jwtRouter');
const qrCodeRouter = require('./api/qrCodeRouter');

const serverPort = 6543;

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/v2/ethereum', ethRouter);
app.use('/v2/bitcoin', btcRouter);
app.use('/v2/xrp', xrpRouter);

app.use('/v2/jwt', jwtRouter);
app.use('/v2/qr', qrCodeRouter);

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
