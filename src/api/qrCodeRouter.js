const express = require('express');
const QRCode = require('qrcode');

const router = express.Router();

router.get('/:currency/:address', async ({ params }, res) => {
  const { currency, address } = params;
  try {
    const url = await QRCode.toDataURL(`${currency}:${address}`);
    res.json({ url });
  } catch (e) {
    console.error(`Unable to generate QR code. ${e}`);
    res.status(500).json({
      error: 'Unable to generate QR code.',
      code: 'qr.code.error',
    });
  }
});

module.exports = router;
