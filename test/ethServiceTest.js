const {describe, it} = require('mocha')
const assert = require('assert')

const ethService = require('../src/service/ethService')
const {ETH, ROPSTEN} = require('../src/constants')

describe('eth Service', () => {
  it('should generate wallet ETH', () => {
    const wallet = ethService.generateWallet(ETH, 'february spin federal ostrich cup breeze fancy lobster industry void elegant loyal')
    assert.strictEqual(wallet.xpriv, 'xprvA1Fhv5bbwbbdZrMM27fJ1HXS8WC3ssJnoXVUVxKjYY8goKEcMqfAscpzo9xQpQHC3GojV2kokRmZTxSFy7cEtbxoGMAoVXf45NVX6WjK7dk')
    assert.strictEqual(wallet.xpub, 'xpub6EF4Kb8Vmy9vnLRp89CJNRUAgY2YHL2eAkR5JLjM6sffg7ZkuNyRRR9UeSe9su4bx94GSk5h8pjuAr5giWbBb1Fr1oMoEfXg4HU8Yr1J1Ma')
  })

  it('should generate wallet ROPSTEN', () => {
    const wallet = ethService.generateWallet(ROPSTEN, 'glove confirm laptop ribbon movie grid moon safe gravity pull shrug toilet')
    assert.strictEqual(wallet.xpriv, 'xprvA1Ru9U3nNrVPHvQXPLPzis1kBH6vqh4Bn1rCwp1bSNnVAqFkRGHhUr62GCSGC2KftfXAGjaeTgio7f88kavjkP6fm8vv8pZFr5wy2eE2v39')
    assert.strictEqual(wallet.xpub, 'xpub6ERFYyagDE3gWQUzVMw15zxUjJwRF9n39EmokCRCziKU3datxobx2eQW7TsJr2tVXzHPmbEvYTAwdqaMAcsUh4EZT569FWkPv6oHPG2yB31')
  })

  it('should calculate address ETH', () => {
    const address = ethService.calculateAddress('xpub6EF4Kb8Vmy9vnLRp89CJNRUAgY2YHL2eAkR5JLjM6sffg7ZkuNyRRR9UeSe9su4bx94GSk5h8pjuAr5giWbBb1Fr1oMoEfXg4HU8Yr1J1Ma', 0)
    assert.strictEqual(address, '0x3ab334951f5d39ee16b4e7d9b44524ae2ba58a00')
  })

  it('should calculate address ROPSTEN', () => {
    const address = ethService.calculateAddress('xpub6ERFYyagDE3gWQUzVMw15zxUjJwRF9n39EmokCRCziKU3datxobx2eQW7TsJr2tVXzHPmbEvYTAwdqaMAcsUh4EZT569FWkPv6oHPG2yB31', 0)
    assert.strictEqual(address, '0xad9ef48c51e58a61e56ce6848245ac83b8a61403')
  })

  it('should calculate private key ETH', () => {
    const privateKey = ethService.calculatePrivateKey(ETH, 'general fun frequent search aunt salon happy control inject relax before guard', 0)
    assert.strictEqual(privateKey, '0xb57a97798843d277ad0c58ca36b3549ac4de555f38aec6ec7f59af3d3becd54e')
  })

  it('should calculate private key ROPSTEN', () => {
    const privateKey = ethService.calculatePrivateKey(ROPSTEN, 'general fun frequent search aunt salon happy control inject relax before guard', 0)
    assert.strictEqual(privateKey, '0x0d2648456fa1824c81807ae897f574f30ab7ae0fcb062637c2c216d112c153bc')
  })
})
