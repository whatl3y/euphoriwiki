import * as config from '../config.js'

export default class Audit {
  constructor(options) {
    options = options || {}

    this._db = options.db || config.mongodb.db
    this._user = options.user || options.username || null
    this._ip = options.ip || null
    this._hostname = options.hostname || null
    this._userAgent = options.ua || options.userAgent || null
  }

  log(options,callback) {
    options = options || {}

    const doc = {
      type: options.type || null,
      user: options.user || options.username || this._user || null,
      date: options.date || new Date(),
      ip: options.ip || this._ip || null,
      hostname: options.hostname || this._hostname || null,
      userAgent: options.ua || this._userAgent || null,
      additional: options.additional || null
    }

    this._db.collection("audit").insert([doc],function(err) {
      if (typeof callback === "function") callback(err);
    })
  }

  find(filters,callback) {
    filters = filters || {}
    this._db.collection("audit").find(filters).toArray(callback)
  }

  static logMessage(options,callback) {
    const audit = new Audit()
    audit.log(options,callback)
  }
}

module.exports = Audit
