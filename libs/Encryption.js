var fs = require('fs')
var crypto = require("crypto");
var config = require("../config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    Encryption.js
|PURPOSE: Handles encryption
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  crypto
|REVISION HISTORY:
|      *LJW 3/11/2016 - created
-----------------------------------------------------------------------------------------*/
Encryption = function(options) {
  options = options || {};

  this.algorithm = options.algorithm || config.cryptography.algorithm;
  this.secret = options.secret || config.cryptography.password;
}

/*-----------------------------------------------------------------------------------------
|NAME:      encrypt (PUBLIC)
|DESCRIPTION:
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: encrypted text
-----------------------------------------------------------------------------------------*/
Encryption.prototype.encrypt = function(text) {
  var cipher = crypto.createCipher(this.algorithm,this.secret)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

/*-----------------------------------------------------------------------------------------
|NAME:      decrypt (PUBLIC)
|DESCRIPTION:
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: decrypted text
-----------------------------------------------------------------------------------------*/
Encryption.prototype.decrypt = function(text) {
  var decipher = crypto.createDecipher(this.algorithm,this.secret)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

/*-----------------------------------------------------------------------------------------
|NAME:      stringToHash (PUBLIC)
|DESCRIPTION:  Takes a string and creates an MD5 hash from it.
|PARAMETERS:  1. string(OPT): The string we're hashing.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>: a string that is MD5 hashed
-----------------------------------------------------------------------------------------*/
Encryption.prototype.stringToHash=function(string) {
  var md5Sum = crypto.createHash("md5");
  md5Sum.update(string);
  return md5Sum.digest("hex");
}

/*-----------------------------------------------------------------------------------------
|NAME:      fileToHash (PUBLIC)
|DESCRIPTION:  Takes a file path and creates an MD5 hash from it.
|PARAMETERS:  1. filePath(OPT): The file path of the file we're hashing.
|             2. cb(REQ): the callback to call after uploading a file
|                     cb(err,hash)
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Encryption.prototype.fileToHash=function(filePath,cb) {
  filePath = filePath || this.dirpath;

  var md5Sum = crypto.createHash("md5");
  var s = fs.ReadStream(filePath);

  s.on("data",function(data) {md5Sum.update(data);});
  s.on("end",function() {cb(null,md5Sum.digest("hex"));});
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Encryption;
}
//-------------------------------------------------------
