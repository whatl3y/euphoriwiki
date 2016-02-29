var _ = require("underscore");
var ActiveDirectory = require("activedirectory");
var config = require('./config.js');

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
  this.username = this.username();
  
  this.config = {
    url: (config.ldap.url) ? (config.ldap.protocol || "ldap")+"://"+config.ldap.url : null,
    baseDN: config.ldap.basedn,
    username: config.ldap.username,
    password: config.ldap.password
  };
  
  this.ad = (this.config.url) ? new ActiveDirectory(this.config) : null;
  this.GLOBAL_ADMIN = process.env.GLOBAL_USERNAME;
  this.GLOBAL_PASSWORD = process.env.GLOBAL_PASSWORD;
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
    if (options.username == this.GLOBAL_ADMIN) {
      cb(null,((options.password == this.GLOBAL_PASSWORD) ? true : false));
    } else {
      try {
        this.ad.authenticate(options.username,options.password,function(err,auth) {
          cb(err,auth);
        });
      } catch(err) {
        cb(err);
      }      
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      find (PUBLIC)
|DESCRIPTION:  Gets a user's information either in a DB or AD/LDAP store
|PARAMETERS:  1. options(REQ): 
|            options.query: if provided, is a full LDAP query to search AD for, otherwise need options.attribute and options.value populated
|            options.attribute
|            options.value
|        2. cb(REQ): callback function to return back whether the user successfully authenticated.
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.find = function(options,cb) {
  options = options || {};
  
  var query = options.query || "";
  var attribute = options.attribute || "sAMAccountName";
  var value = options.value || "";
  
  if (!query && !value) {
    cb("No value was provided for the " + attribute + " attribute. Please provide a value.");
  } else {
    try {
      if (query) this.ad.find({timeout:10000, filter:query},cb);
      else this.ad.find({timeout:10000, filter:attribute + "=" + value},cb);
      
    } catch(err) {
      cb(err);
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      getGroupMembershipForUser (PUBLIC)
|DESCRIPTION:  Returns all groups the user specified is a member of.
|PARAMETERS:  1. options(REQ): 
|               options.username: sAMAccountName, UPN, or DN of user
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.getGroupMembershipForUser = function(options,cb) {
  options = options || {};
  
  var username = (typeof options==="string") ? options : (options.username || "");
  
  if (!(username)) {
    cb("Please provide a username.");
  } else {
    try {
      this.ad.getGroupMembershipForUser(username,cb);
    } catch(err) {
      cb(err);
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      isUserMemberOf (PUBLIC)
|DESCRIPTION:  Determine if a user is a member of a group.
|PARAMETERS:  1. options(REQ): 
|               options.username: sAMAccountName, UPN, or DN of user
|               options.groupName: cn or dn of group
|             2. cb(REQ): callback function to return back whether the user successfully authenticated.
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.isUserMemberOf = function(options,cb) {
  options = options || {};
  
  var username = options.username;
  var group = options.groupName || options.group;
  
  if (!(username && group)) {
    cb("Please provide both a username and group name.");
  } else {
    try {
      this.ad.isUserMemberOf(username,group,cb);
    } catch(err) {
      cb(err);
    }
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      login (PUBLIC)
|DESCRIPTION:  Gets necessary information about a user and logs them in by saving to the session.
|PARAMETERS:  1. upn(REQ): userPrincipalName we're going to find, then store information in the session
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
Authentication.prototype.login = function(upn,cb) {
  var self = this;
  
  if (upn == this.GLOBAL_ADMIN) {
    self.session.ADMIN = true;
    self.session.username = this.GLOBAL_ADMIN;
    self.session.sAMAccountName = this.GLOBAL_ADMIN;
    
    self.session.loggedIn = true;
    self.session.save();
    cb(null);
  } else {
    this.find({attribute:"userPrincipalName", value:upn},function(err,info) {
      if (err) cb(err);
      else {
        //assuming the first user is the one we want
        var userInfo = info.users[0];
        
        _.each(Object.keys(userInfo),function(p) {
          self.session[p] = userInfo[p];
        });
        
        self.session.username = self.session.sAMAccountName.toLowerCase();
        self.session.email = self.session.mail.toLowerCase();
        self.session.loggedIn = true;
        self.session.save();
        cb(null);
      }
    });
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      username (PUBLIC)
|DESCRIPTION:  Determines if a user is logged in and returns the username if so, false otherwise.
|PARAMETERS:    None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string or false>: string if logged in with username, else false
-----------------------------------------------------------------------------------------*/
Authentication.prototype.username = function() {
  return (this.isLoggedIn()) ? (this.session.username || this.session.sAMAccountName.toLowerCase()) : false;
}

/*-----------------------------------------------------------------------------------------
|NAME:      getEmail (PUBLIC)
|DESCRIPTION:  Gets an e-mail address from a logged in user
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <string>: string of an e-mail for the logged in user
-----------------------------------------------------------------------------------------*/
Authentication.prototype.getEmail = function() {
  return (this.isLoggedIn()) ? this.session.email : false;
}

/*-----------------------------------------------------------------------------------------
|NAME:      isLoggedIn (PUBLIC)
|DESCRIPTION:  Determines if a user is logged in and returns that in a callback function
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <boolean>: true/false if user is logged in
-----------------------------------------------------------------------------------------*/
Authentication.prototype.isLoggedIn = function() {
  return (typeof this.session!=="undefined") ? !!this.session.loggedIn : false;
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Authentication;
}
//-------------------------------------------------------