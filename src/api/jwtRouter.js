'use strict';
const express = require('express')
const jwt = require('jsonwebtoken')

const router = express.Router()

router.get('/:key/:secret', ({params}, res) => {
  const {key, secret} = params
  const token = jwt.sign({apiKey: key, created: new Date().getTime()}, secret, {
    noTimestamp: true,
    header: {
      "alg": "HS256",
      "typ": "JWT"
    }
  })
  res.json(token)
})

module.exports = router
