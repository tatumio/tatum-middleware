'use strict';

const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const expressSwaggerGenerator = require('express-swagger-generator');

const axiosInstance = axios.create({
  baseURL: process.env.API_URL
})

const ethRouter = require('./api/ethRouter')
const btcRouter = require('./api/btcRouter')

const serverPort = 6543;

const app = express()
const options = {
  swaggerDefinition: {
    info: {
      description: 'Tatum Middleware available for Tatum Core OpenBanking API to simplify usage.',
      title: 'Tatum Middleware',
      version: '1.0.0',
    },
    host: `localhost:${serverPort}`,
    basePath: '/util/v1',
    produces: [
      'application/json',
    ],
    consumes: [
      'application/json',
    ],
    schemes: ['http', 'https']
  },
  basedir: __dirname, //app absolute path
  files: ['./**/*.js'] //Path to the API handle folder
};
app.use(bodyParser.json())

const expressSwagger = expressSwaggerGenerator(app)
expressSwagger(options)

app.use('/util/v1/eth', ethRouter)
app.use('/util/v1/btc', btcRouter)

/**
 * Methods of Tatum Core API. Resends all HTTP headers, paths, query params and HTTP body to set up Tatum Core Endpoint.
 * @route GET /**
 * @route POST /**
 * @route PUT /**
 * @route DELETE /**
 * @group Tatum Core - Proxy methods to Tatum Core API
 */
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
