import path from 'path'
import * as assert from 'assert'
import Encryption from '../../libs/Encryption.js'

describe('Encryption', function() {
  const enc = new Encryption({secret: 'abc123'})
  const originalText = 'test123'
  let cipherText
  let plainText
  let hash

  describe('#encrypt()', function() {
    it(`should encrypt string without issue`, function(done) {
      cipherText =enc.encrypt(originalText)
      done(assert.equal(typeof cipherText, 'string'))
    })
  })

  describe('#decrypt()', function() {
    it(`should decrypt cipher string without issue`, function(done) {
      plainText = enc.decrypt(cipherText)
      done(assert.equal(typeof plainText, 'string') && assert.equal(plainText, originalText))
    })
  })

  describe('#stringToHash()', function() {
    it(`should hash string without issue`, function(done) {
      hash = enc.stringToHash(plainText)
      done(assert.equal(typeof hash, 'string'))
    })
  })

  describe('#fileToHash()', function() {
    it(`should hash file contents without issue`, function(done) {
      enc.fileToHash(path.join(__dirname,'Audit.js'),done)
    })
  })
})
