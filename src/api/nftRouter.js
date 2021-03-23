const express = require('express');
const {
  deployNFT,
  mintNFTWithUri,
  mintMultipleNFTWithUri,
  burnNFT,
  transferNFT,
} = require('@tatumio/tatum');

const router = express.Router();

router.post('/nft/deploy', async ({body}, res) => {
  try {
    res.status(200).json(await deployNFT(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'nft.error',
    });
  }
});

router.post('/nft/transaction', async ({body}, res) => {
  try {
    res.status(200).json(await transferNFT(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'nft.error',
    });
  }
});

router.post('/nft/mint', async ({body}, res) => {
  try {
    res.status(200).json(await mintNFTWithUri(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'nft.error',
    });
  }
});

router.post('/nft/mint/batch', async ({body}, res) => {
  try {
    res.status(200).json(await mintMultipleNFTWithUri(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'nft.error',
    });
  }
});

router.post('/nft/burn', async ({body}, res) => {
  try {
    res.status(200).json(await burnNFT(process.env.MODE !== 'MAINNET', body));
  } catch (e) {
    console.error(e);
    res.status(400).json({
      message: `Unable to prepare transaction. Possible error: ${e.message || e}`,
      statusCode: 400,
      errorCode: 'nft.error',
    });
  }
});

module.exports = router;
