'use strict';

const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const axiosInstance = axios.create({
  baseURL: process.env.API_URL
})

module.exports = {
  axios: axiosInstance
}

const ethRouter = require('./api/ethRouter')
const btcRouter = require('./api/btcRouter')

const serverPort = 6543;

const app = express()
app.use(bodyParser.json())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/util/v1/eth', ethRouter)
app.use('/util/v1/btc', btcRouter)

app.use(({url, method, headers, body: data}, res) => {
  // default handling of Tatum APIs
  axiosInstance({
    method,
    url,
    data,
    headers: {
      'content-type': headers['content-type'] || 'application/json',
      'accept': headers['accept'] || 'application/json',
      'x-client-secret': headers['x-client-secret']
    }
  })
    .then((response) => {
      res.status(response.status).send(response.data)
    })
    .catch((error) => {
      if (error.response) {
        console.error(error.response)
        res.status(error.response.status).send(error.response.data)
      } else {
        console.error(error)
        res.status(404).send(error.message)
      }
    })
})

app.listen(serverPort, () => console.log(`Tatum Middleware listening on port ${serverPort}!`));
