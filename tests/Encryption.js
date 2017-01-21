import * as assert from 'assert'
import Encryption from '../libs/Encryption.js'

describe('Encryption', function() {
  const originalText = 'test123'
  let cipherText
  let plainText

  describe('#encrypt()', function() {
    it(`should encrypt string without issue`, function(done) {
      cipherText = new Encryption().encrypt(originalText)
      done(assert.equal(typeof cipherText, 'string'))
    })
  })

  describe('#decrypt()', function() {
    it(`should decrypt cipher string without issue`, function(done) {
      plainText = new Encryption().decrypt(cipherText)
      done(assert.equal(typeof plainText, 'string') && assert.equal(plainText, originalText))
    })
  })
})
