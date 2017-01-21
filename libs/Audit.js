"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _config = require("../config.js");

var config = _interopRequireWildcard(_config);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Audit = function () {
  function Audit(options) {
    _classCallCheck(this, Audit);

    options = options || {};

    this._db = options.db || config.mongodb.db;
    this._user = options.user || options.username || null;
    this._ip = options.ip || null;
    this._hostname = options.hostname || null;
    this._userAgent = options.ua || options.userAgent || null;
  }

  _createClass(Audit, [{
    key: "log",
    value: function log(options, callback) {
      options = options || {};

      var doc = {
        type: options.type || null,
        user: options.user || options.username || this._user || null,
        date: options.date || new Date(),
        ip: options.ip || this._ip || null,
        hostname: options.hostname || this._hostname || null,
        userAgent: options.ua || this._userAgent || null,
        additional: options.additional || null
      };

      this._db.collection("audit").insert([doc], function (err) {
        if (typeof callback === "function") callback(err);
      });
    }
  }, {
    key: "find",
    value: function find(filters, callback) {
      filters = filters || {};
      this._db.collection("audit").find(filters).toArray(callback);
    }
  }], [{
    key: "logMessage",
    value: function logMessage(options, callback) {
      var audit = new Audit();
      audit.log(options, callback);
    }
  }]);

  return Audit;
}();

exports.default = Audit;


module.exports = Audit;