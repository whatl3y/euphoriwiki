var argv = require('minimist')(process.argv.slice(2))
var fs = require('fs')
var Encryption = require('../libs/Encryption.js')

//filepath should be in 3rd param
//    EXAMPLE CALL: >node encryption [-d][-e] string
const encryptText = argv.e || argv.encrypt
const decryptText = argv.d || argv.decrypt
const outputFilePath = argv.o || argv.output
const which = (encryptText) ? 'e' : 'd'
var text = encryptText || decryptText

switch (which) {
  case 'e':
    write(new Encryption().encrypt(text), outputFilePath)
    break;

  case 'd':
    write(new Encryption().decrypt(text), outputFilePath)
    break;

  default:
    console.log('Please enter an argument, -e to encrypt, -d to decrypt.')
}

function write(text, filePath=null) {
  if (filePath) {
    return fs.writeFileSync(filePath, text)
  }
  console.log(text)
}
