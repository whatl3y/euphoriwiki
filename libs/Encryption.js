'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _config = require('../config');

var config = _interopRequireWildcard(_config);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// -------------------------
// need to resolve following errors with importing crypto
// (node:27245) DeprecationWarning: crypto.createCredentials is deprecated. Use tls.createSecureContext instead.
// (node:27245) DeprecationWarning: crypto.Credentials is deprecated. Use tls.SecureContext instead.
// import * as crypto from 'crypto'
var crypto = require('crypto');
// -------------------------

var Encryption = function () {
  function Encryption(options) {
    _classCallCheck(this, Encryption);

    options = options || {};
    this._algorithm = options.algorithm || config.cryptography.algorithm;
    this._secret = options.secret || config.cryptography.password;
  }

  _createClass(Encryption, [{
    key: 'encrypt',
    value: function encrypt(text) {
      var cipher = crypto.createCipher(this._algorithm, this._secret);
      var crypted = cipher.update(text, 'utf8', 'hex');
      crypted += cipher.final('hex');
      return crypted;
    }
  }, {
    key: 'decrypt',
    value: function decrypt(text) {
      var decipher = crypto.createDecipher(this._algorithm, this._secret);
      var dec = decipher.update(text, 'hex', 'utf8');
      dec += decipher.final('utf8');
      return dec;
    }
  }, {
    key: 'stringToHash',
    value: function stringToHash(string) {
      var md5Sum = crypto.createHash("md5");
      md5Sum.update(string);
      return md5Sum.digest("hex");
    }
  }, {
    key: 'fileToHash',
    value: function fileToHash(filePath, callback) {
      filePath = filePath;
      var md5Sum = crypto.createHash("md5");

      var s = _fs2.default.ReadStream(filePath);
      s.on("data", function (data) {
        return md5Sum.update(data);
      });
      s.on("end", function () {
        return callback(null, md5Sum.digest("hex"));
      });
    }
  }]);

  return Encryption;
}();

exports.default = Encryption;


module.exports = Encryption;