var config = require('./config.js');

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
Audit=function(options) {
  options = options || {};
  
  this.user = options.user || options.username || null;
  this.ip = options.ip || null;
  this.hostname = options.hostname || null;
  this.userAgent = options.ua || options.userAgent || null;
}

/*-----------------------------------------------------------------------------------------
|NAME:      log (PUBLIC)
|DESCRIPTION:  Logs an Audit entry in the DB.
|PARAMETERS:  1. cb(OPT): Optional callback to run after the audit log is filed.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Audit.prototype.log=function(options,cb) {
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
  
  config.mongodb.db.collection("audit").insert([doc],function(err,result) {
    if (typeof cb==="function") cb(err);
  });
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Audit;
}
//-------------------------------------------------------