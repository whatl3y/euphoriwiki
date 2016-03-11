var crypto = require("crypto");
var config = require("./config.js");

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

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Encryption;
}
//-------------------------------------------------------