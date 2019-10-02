const {describe, it} = require('mocha');
const assert = require('assert');

const btcService = require('../src/service/btcService');
const {BTC, TBTC} = require('../src/constants');

describe('btc Service', () => {
  it('should generate wallet BTC', () => {
    const wallet = btcService.generateWallet(BTC, 'calm hole weird good address luxury original dry marine symbol above perfect');
    assert.strictEqual(wallet.xpriv, 'xprvA2AwVhg5yZWEQgixYZ1CmRDGFCM5PVGhmQfwQW3dbNr79VnNYYJTUQ1YW2ySXU7U8r5uiyGm5fNCKhQsfd1XDRcbjatT2xj33EUXuToQbcp');
    assert.strictEqual(wallet.xpub, 'xpub6FAHuDCyow4XdAoReaYD8Z9zoEBZnwzZ8dbYCtTF9iP62J7X65ci2CL2MKsPz7g7RszkDLGzgvsrTNedGNNa8JW3bEZsuhRTtQDs1JvmZ2E');
  });

  it('should generate wallet TBTC', () => {
    const wallet = btcService.generateWallet(TBTC, 'genuine dice blade live rich access venture pride era crucial cousin minimum');
    assert.strictEqual(wallet.xpriv, 'tprv8heYqu1nGFTCARvPYB9DsDGcGfnDnyuynpF87M51PLhHdSgNehVBGL84UHu3rnTcGb1Acu61DkW4tVqjafqR1WDv5Q6VCJx4fEbu2wrvGnK');
    assert.strictEqual(wallet.xpub, 'tpubDELazK42Qd8s3txBRpopGcviqhJ9xK6tN7quPs7JocVgTvw9H6JmSpjveSRaqTDkjmwk3UGaBKCaQXRAoCNA1eL4D9P2aguE5wzgBpVD3B1');
  });

  it('should calculate address BTC', () => {
    const address = btcService.calculateAddress('xpub6FAHuDCyow4XdAoReaYD8Z9zoEBZnwzZ8dbYCtTF9iP62J7X65ci2CL2MKsPz7g7RszkDLGzgvsrTNedGNNa8JW3bEZsuhRTtQDs1JvmZ2E', BTC, 1);
    assert.strictEqual(address, '1KfCCC5K1f3kzU2uNRkxHjY3jskChrouFW');
  });

  it('should calculate address TBTC', () => {
    const address = btcService.calculateAddress('tpubDELazK42Qd8s3txBRpopGcviqhJ9xK6tN7quPs7JocVgTvw9H6JmSpjveSRaqTDkjmwk3UGaBKCaQXRAoCNA1eL4D9P2aguE5wzgBpVD3B1', TBTC, 0);
    assert.strictEqual(address, 'mtQygZAEbmgBCPJNMYRjGxa4C3kgTNdmXM');
  });

  it('should calculate private key WIF BTC', () => {
    const privateKey = btcService.calculatePrivateKey(BTC, 'calm hole weird good address luxury original dry marine symbol above perfect', 0);
    assert.strictEqual(privateKey, 'L3Ku4QyNbKJu2na6mMFDqotP7M4CZLxNSCFksxkEZeLZ2NrjmBBt');
  });

  it('should calculate private key WIF TBTC', () => {
    const privateKey = btcService.calculatePrivateKey(TBTC, 'calm hole weird good address luxury original dry marine symbol above perfect', 0);
    assert.strictEqual(privateKey, 'cTmS2jBWXgFaXZ2xG9jhn67TiyTshnMp3UedamzEhGm6BZV1vLgQ');
  });
});
