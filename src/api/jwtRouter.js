const express = require('express');
const {generateJwt} = require('../service/commonService');

const router = express.Router();

router.get('/:key/:secret', ({params}, res) => {
  const {key, secret} = params;
  const token = generateJwt(key, secret);
  res.json({token});
});

module.exports = router;
