const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get('/:key/:secret', ({ params }, res) => {
  const { key, secret } = params;
  const token = jwt.sign({ apiKey: key, created: Date.now() }, secret);
  res.json({token});
});

module.exports = router;
