import fs from 'fs'
import minimist from 'minimist'
import Encryption from '../libs/Encryption.js'

const argv = minimist(process.argv.slice(2))

//filepath should be in 3rd param
//    EXAMPLE CALL: >node encryption [-d][-e] string
const encryptText = argv.e || argv.encrypt
const decryptText = argv.d || argv.decrypt
const inputFilePath = argv.i || argv.input
const outputFilePath = argv.o || argv.output
const which = (decryptText || decryptText === '') ? 'd' : 'e'

const text = read(encryptText || decryptText, inputFilePath)

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

function read(rawText, filePath=null) {
  if (filePath) {
    return fs.readFileSync(filePath, 'utf8')
  }
  return rawText
}

function write(text, filePath=null) {
  if (filePath) {
    return fs.writeFileSync(filePath, text)
  }
  console.log(text)
}
