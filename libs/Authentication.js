var config = require('./config.js');
var _ = require("underscore");
var ActiveDirectory = require("activedirectory");
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:    Authentication.js
|PURPOSE:  Makes it easier and more readable to handle socket.io
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:  
|      *LJW 2/28/2015 - created
-----------------------------------------------------------------------------------------*/
Authentication = function(options) {
  options = options || {};
  
  this.session = options.session;        //the session object we will be able to save for future requests
  
  this.config = {
    url: (config.ldap.protocol || "ldap")+"://"+config.ldap.url,
    baseDN: config.ldap.basedn,
    username: config.ldap.username,
    password: config.ldap.password
  };
  
  this.ad = new ActiveDirectory(this.config);
}

/*-----------------------------------------------------------------------------------------
|NAME:      auth (PUBLIC)
|DESCRIPTION:  Tries to authenticate a user based on a username/password combination.
|PARAMETERS:  1. options(REQ): 
|            options.username
|            options.password
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.auth = function(options,cb) {
  options = options || {};
  
  if (!(options.username && options.password)) {
    cb("Either a username or password was not provided.");
  } else {
    this.ad.authenticate(options.username,options.password,function(err,auth) {
      cb(err,auth);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      find (PUBLIC)
|DESCRIPTION:  Gets a user's information either in a DB or AD/LDAP store
|PARAMETERS:  1. options(REQ): 
|            options.attribute
|            options.value
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.find = function(options,cb) {
  options = options || {};
  options.attribute = options.attribute || "sAMAccountName";
  
  if (!options.value) {
    cb("No value was provided for the " + options.attribute + " attribute. Please provide a value.");
  } else {
    this.ad.find(options.attribute + "=" + options.value,function(err,info) {
      cb(err,info);
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      login (PUBLIC)
|DESCRIPTION:  Gets necessary information about a user and logs them in by saving to the session.
|PARAMETERS:  1. upn(REQ): userPrincipalName we're going to find, then store information in the session
|        2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.login = function(upn,cb) {
  var self = this;
  
  this.find({attribute:"userPrincipalName", value:upn},function(err,info) {
    if (err) cb(err);
    else {
      //assuming the first user is the one we want
      var userInfo = info.users[0];
      
      _.each(Object.keys(userInfo),function(p) {
        self.session[p] = userInfo[p];
      });
      
      self.session.loggedIn = true;
      self.session.save();
      cb(null);
    }
  });
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Authentication;
}
//-------------------------------------------------------