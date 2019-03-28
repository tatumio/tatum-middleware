const {describe, it} = require('mocha')
const assert = require('assert')

const btcService = require('../src/service/btcService')
const {BTC, TBTC} = require('../src/constants')

describe('btc Service', () => {
  it('should generate wallet BTC', () => {
    const wallet = btcService.generateWallet(BTC, 'calm hole weird good address luxury original dry marine symbol above perfect')
    assert.strictEqual(wallet.xpriv, 'xprvA2AwVhg5yZWEQgixYZ1CmRDGFCM5PVGhmQfwQW3dbNr79VnNYYJTUQ1YW2ySXU7U8r5uiyGm5fNCKhQsfd1XDRcbjatT2xj33EUXuToQbcp')
    assert.strictEqual(wallet.xpub, 'xpub6FAHuDCyow4XdAoReaYD8Z9zoEBZnwzZ8dbYCtTF9iP62J7X65ci2CL2MKsPz7g7RszkDLGzgvsrTNedGNNa8JW3bEZsuhRTtQDs1JvmZ2E')
  })

  it('should generate wallet TBTC', () => {
    const wallet = btcService.generateWallet(TBTC, 'genuine dice blade live rich access venture pride era crucial cousin minimum')
    assert.strictEqual(wallet.xpriv, 'tprv8heYqu1nGFTCARvPYB9DsDGcGfnDnyuynpF87M51PLhHdSgNehVBGL84UHu3rnTcGb1Acu61DkW4tVqjafqR1WDv5Q6VCJx4fEbu2wrvGnK')
    assert.strictEqual(wallet.xpub, 'tpubDELazK42Qd8s3txBRpopGcviqhJ9xK6tN7quPs7JocVgTvw9H6JmSpjveSRaqTDkjmwk3UGaBKCaQXRAoCNA1eL4D9P2aguE5wzgBpVD3B1')
  })

  it('should calculate address BTC', () => {
    const address = btcService.calculateAddress('xpub6FAHuDCyow4XdAoReaYD8Z9zoEBZnwzZ8dbYCtTF9iP62J7X65ci2CL2MKsPz7g7RszkDLGzgvsrTNedGNNa8JW3bEZsuhRTtQDs1JvmZ2E', BTC, 1)
    assert.strictEqual(address, '1KfCCC5K1f3kzU2uNRkxHjY3jskChrouFW')
  })

  it('should calculate address TBTC', () => {
    const address = btcService.calculateAddress('tpubDELazK42Qd8s3txBRpopGcviqhJ9xK6tN7quPs7JocVgTvw9H6JmSpjveSRaqTDkjmwk3UGaBKCaQXRAoCNA1eL4D9P2aguE5wzgBpVD3B1', TBTC, 0)
    assert.strictEqual(address, 'mtQygZAEbmgBCPJNMYRjGxa4C3kgTNdmXM')
  })

  it('should calculate private key WIF BTC', () => {
    const privateKey = btcService.calculatePrivateKey(BTC, 'calm hole weird good address luxury original dry marine symbol above perfect', 0)
    assert.strictEqual(privateKey, 'L3Ku4QyNbKJu2na6mMFDqotP7M4CZLxNSCFksxkEZeLZ2NrjmBBt')
  })

  it('should calculate private key WIF TBTC', () => {
    const privateKey = btcService.calculatePrivateKey(TBTC, 'calm hole weird good address luxury original dry marine symbol above perfect', 0)
    assert.strictEqual(privateKey, 'cTmS2jBWXgFaXZ2xG9jhn67TiyTshnMp3UedamzEhGm6BZV1vLgQ')
  })

  it('should prepare TBTC transaction', () => {
    const txhex = btcService.prepareTransaction(
      ['fe1c3158031c76805be6fb916db4da880da72d2f228950940d51a0ae2f56bf41'],
      [1],
      [{
        address: null,
        derivationKey: 0,
        xpub: null
      }],
      [2.74051161],
      '2Mzzkr9abeXpmCNSqSbEaGoscoCBS7DdJar',
      TBTC,
      0.05,
      0.0005,
      'language kidney debate bike gun evolve science patch blanket minimum shoulder friend'
    )
    assert.strictEqual(txhex, '010000000141bf562faea0510d945089222f2da70d88dab46d91fbe65b80761c0358311cfe010000006b483045022100e7d6e2ec6d126a5f4916105ada5ee6f9517676f25becc41b86c69c369dd91b7702200b88f18cf7f82b8719b5a90aebe9b247e2583f3dd7f8b098761f67c05977c1600121024db1a6100dd686f1f13ebb9e41d860509e04127a85199dc0634e6635cd78b653ffffffff02404b4c000000000017a914550486fa303e330fc6737f3d15e5fa6d97b3981987c9a10810000000001976a91400acc4fab91d8645a068517b196372542bfdeb1d88ac00000000')
  })
})
