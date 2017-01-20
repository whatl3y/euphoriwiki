"use strict";

var config = require("../config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    Audit.js
|PURPOSE:  Handles all things to do with getting information about a wiki page.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:
|      *LJW 1/28/2016 - created
-----------------------------------------------------------------------------------------*/
var Audit = function Audit(options) {
  options = options || {};

  this.user = options.user || options.username || null;
  this.ip = options.ip || null;
  this.hostname = options.hostname || null;
  this.userAgent = options.ua || options.userAgent || null;
};

/*-----------------------------------------------------------------------------------------
|NAME:      log (PUBLIC)
|DESCRIPTION:  Logs an Audit entry in the DB.
|PARAMETERS:  1. options(OPT):
|             2. cb(OPT): Optional callback to run after the audit log is filed.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Audit.prototype.log = function (options, cb) {
  options = options || {};

  var doc = {
    type: options.type || null,
    user: options.user || options.username || this.user || null,
    date: options.date || new Date(),
    ip: options.ip || this.ip || null,
    hostname: options.hostname || this.hostname || null,
    userAgent: options.ua || this.userAgent || null,
    additional: options.additional || null
  };

  config.mongodb.db.collection("audit").insert([doc], function (err) {
    if (typeof cb === "function") cb(err);
  });
};

/*-----------------------------------------------------------------------------------------
|NAME:      find (PUBLIC)
|DESCRIPTION:  Finds audit entries.
|PARAMETERS:  1. filters(OPT): optional set of filters we want to filter the returned items to
|             2. cb(OPT): Optional callback to run after the audit log is filed.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Audit.prototype.find = function (filters, cb) {
  filters = filters || {};

  config.mongodb.db.collection("audit").find(filters).toArray(cb);
};

module.exports = Audit;