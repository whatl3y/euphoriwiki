// -------------------------
// need to resolve following errors with importing crypto
// (node:27245) DeprecationWarning: crypto.createCredentials is deprecated. Use tls.createSecureContext instead.
// (node:27245) DeprecationWarning: crypto.Credentials is deprecated. Use tls.SecureContext instead.
// import * as crypto from 'crypto'
const crypto = require('crypto')
// -------------------------
import fs from 'fs'
import config from '../config'

export default class Encryption {
  constructor(options) {
    options = options || {}
    this._algorithm = options.algorithm || config.cryptography.algorithm
    this._secret = options.secret || config.cryptography.password
  }

  encrypt(text) {
    const cipher = crypto.createCipher(this._algorithm,this._secret)
    let crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex')
    return crypted
  }

  decrypt(text) {
    const decipher = crypto.createDecipher(this._algorithm,this._secret)
    let dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8')
    return dec
  }

  stringToHash(string) {
    const md5Sum = crypto.createHash("md5")
    md5Sum.update(string)
    return md5Sum.digest("hex")
  }

  fileToHash(filePath,callback) {
    filePath = filePath
    const md5Sum = crypto.createHash("md5")

    const s = fs.ReadStream(filePath)
    s.on("data",(data) => md5Sum.update(data))
    s.on("end",() => callback(null,md5Sum.digest("hex")))
  }
}

module.exports = Encryption
